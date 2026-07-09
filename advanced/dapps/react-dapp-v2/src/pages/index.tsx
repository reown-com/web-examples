import type { NextPage } from "next";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Connection, PublicKey } from "@solana/web3.js";
import { Contract, JsonRpcProvider, formatUnits, parseUnits } from "ethers";

import { useWalletConnectClient } from "../contexts/ClientContext";
import { getProviderUrl } from "../helpers";
import { parseFeeTerms } from "../helpers/feeTerms";
import {
  base64ToBytes,
  buildJupiterSwapTransaction,
  formatTokenAmount,
  getAssociatedTokenAddress,
  getJupiterPrices,
  getJupiterQuote,
  JupiterQuote,
  JUPITER_MAX_FEE_BPS,
  SOL_DECIMALS,
  SOL_MINT,
  SOLANA_MAINNET_CAIP,
  USDC_DECIMALS,
  USDC_MINT,
} from "../helpers/jupiter";
import {
  ARBITRUM_CAIP,
  ARBITRUM_USDC,
  buildOneInchSwap,
  ETH_DECIMALS,
  getEvmPrices,
  getOneInchQuote,
  ONEINCH_MAX_FEE_BPS,
  toWalletConnectTx,
} from "../helpers/oneinch";
import {
  buildKyberSwap,
  getKyberRoute,
  KYBER_MAX_FEE_BPS,
  kyberToWalletConnectTx,
} from "../helpers/kyberswap";
import {
  buildUniswapSwap,
  getUniswapQuote,
  UNISWAP_MAX_FEE_BPS,
  UniswapQuote,
  uniswapToWalletConnectTx,
} from "../helpers/uniswap";

/**
 * Session Fees POC — single swap screen with selectable aggregator.
 *
 * The wallet declares fee terms in `sessionProperties.wc_feeTerms` at session
 * approval; this dapp reads them and passes them as a per-request integrator
 * fee into the selected aggregator's API (Jupiter on Solana, 1inch on
 * Arbitrum). The fee is baked into the swap transaction — one signature.
 * Aggregator-specific logic lives in helpers/jupiter.ts and helpers/oneinch.ts.
 */

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || getProviderUrl(SOLANA_MAINNET_CAIP);
const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || getProviderUrl(ARBITRUM_CAIP);

const SLIPPAGE_BPS = 50;
// Kyber routes pin exact pool states; small demo swaps ride volatile
// micro-pools, so give them a wider guard than the other aggregators.
const KYBER_SLIPPAGE_BPS = 100;
// UI label only for the POC — no split contract exists.
const FEE_SPLIT_LABEL = "80% wallet / 20% WCN";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

type AggregatorId = "jupiter" | "oneinch" | "kyberswap" | "uniswap";

const AGGREGATORS: Record<
  AggregatorId,
  {
    label: string;
    chainLabel: string;
    caip: string;
    sellSymbol: string;
    sellDecimals: number;
    sellIcon: string;
    sellColor: string;
    maxFeeBps: number;
    explorerTx: (id: string) => string;
    explorerAddress: (address: string) => string;
  }
> = {
  jupiter: {
    label: "Jupiter",
    chainLabel: "Solana",
    caip: SOLANA_MAINNET_CAIP,
    sellSymbol: "SOL",
    sellDecimals: SOL_DECIMALS,
    sellIcon: "◎",
    sellColor: "#9945FF",
    maxFeeBps: JUPITER_MAX_FEE_BPS,
    explorerTx: (id) => `https://solscan.io/tx/${id}`,
    explorerAddress: (address) => `https://solscan.io/account/${address}`,
  },
  oneinch: {
    label: "1inch",
    chainLabel: "Arbitrum",
    caip: ARBITRUM_CAIP,
    sellSymbol: "ETH",
    sellDecimals: ETH_DECIMALS,
    sellIcon: "Ξ",
    sellColor: "#627EEA",
    maxFeeBps: ONEINCH_MAX_FEE_BPS,
    explorerTx: (id) => `https://arbiscan.io/tx/${id}`,
    explorerAddress: (address) => `https://arbiscan.io/address/${address}`,
  },
  kyberswap: {
    label: "KyberSwap",
    chainLabel: "Arbitrum",
    caip: ARBITRUM_CAIP,
    sellSymbol: "ETH",
    sellDecimals: ETH_DECIMALS,
    sellIcon: "Ξ",
    sellColor: "#31CB9E",
    maxFeeBps: KYBER_MAX_FEE_BPS,
    explorerTx: (id) => `https://arbiscan.io/tx/${id}`,
    explorerAddress: (address) => `https://arbiscan.io/address/${address}`,
  },
  uniswap: {
    label: "Uniswap",
    chainLabel: "Arbitrum",
    caip: ARBITRUM_CAIP,
    sellSymbol: "ETH",
    sellDecimals: ETH_DECIMALS,
    sellIcon: "Ξ",
    sellColor: "#FC72FF",
    maxFeeBps: UNISWAP_MAX_FEE_BPS,
    explorerTx: (id) => `https://arbiscan.io/tx/${id}`,
    explorerAddress: (address) => `https://arbiscan.io/address/${address}`,
  },
};

/** Aggregator-agnostic quote used by the UI (amounts in USDC base units). */
interface SwapQuote {
  outAmount: string;
  minOut: string;
  feeAmount?: string;
  priceImpactPct?: string;
  jupiter?: JupiterQuote;
  uniswap?: UniswapQuote;
}

type SwapPhase = "idle" | "building" | "signing" | "sending" | "confirming";

const PHASE_LABELS: Record<SwapPhase, string> = {
  idle: "Swap",
  building: "Building transaction…",
  signing: "Sign in your wallet…",
  sending: "Sending…",
  confirming: "Confirming…",
};

const Home: NextPage = () => {
  const {
    session,
    client,
    connect,
    disconnect,
    isInitializing,
    setChains,
    accounts,
  } = useWalletConnectClient();

  const [aggregator, setAggregator] = useState<AggregatorId>("jupiter");
  const agg = AGGREGATORS[aggregator];
  const isJupiter = aggregator === "jupiter";

  // Restore the aggregator choice across reloads (read after mount — SSR has
  // no localStorage).
  useEffect(() => {
    const stored = localStorage.getItem("session_fees_aggregator");
    if (stored && stored in AGGREGATORS) {
      setAggregator(stored as AggregatorId);
    }
  }, []);

  const solanaConnection = useMemo(() => new Connection(SOLANA_RPC_URL), []);
  const evmProvider = useMemo(() => new JsonRpcProvider(ARBITRUM_RPC_URL), []);

  // Request both demo chains so the aggregator can be switched per session.
  useEffect(() => {
    setChains([SOLANA_MAINNET_CAIP, ARBITRUM_CAIP]);
  }, [setChains]);

  const solanaAddress = useMemo(
    () =>
      accounts.find((account) => account.startsWith("solana:"))?.split(":")[2],
    [accounts],
  );
  const evmAddress = useMemo(
    () =>
      accounts
        .find((account) => account.startsWith(`${ARBITRUM_CAIP}:`))
        ?.split(":")[2],
    [accounts],
  );
  const activeAddress = isJupiter ? solanaAddress : evmAddress;

  // -------- fee terms from the session --------
  const feeTerms = useMemo(
    () => parseFeeTerms(session?.sessionProperties),
    [session],
  );
  const activeFeeRecipient = isJupiter
    ? feeTerms?.feeRecipient
    : feeTerms?.feeRecipientEip155;
  const feeBps =
    feeTerms && activeFeeRecipient
      ? Math.min(feeTerms.feeBps, agg.maxFeeBps)
      : 0;
  // Jupiter collects the fee into a token account: the recipient's USDC ATA.
  const feeAta = useMemo(() => {
    if (!isJupiter || !feeTerms?.feeRecipient) return undefined;
    try {
      return getAssociatedTokenAddress(feeTerms.feeRecipient, USDC_MINT);
    } catch (e) {
      console.warn("Invalid Solana fee recipient:", feeTerms.feeRecipient, e);
      return undefined;
    }
  }, [isJupiter, feeTerms]);

  // -------- amount input & quote --------
  const [sellAmount, setSellAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote>();
  const [quoteError, setQuoteError] = useState<string>();
  const [isQuoting, setIsQuoting] = useState(false);
  const quoteSeq = useRef(0);

  const sellRaw = useMemo(() => {
    try {
      const raw = parseUnits(sellAmount || "0", agg.sellDecimals);
      return raw > 0n ? raw.toString() : undefined;
    } catch {
      return undefined;
    }
  }, [sellAmount, agg.sellDecimals]);

  const refreshQuote = useCallback(async () => {
    if (!sellRaw) {
      setQuote(undefined);
      setQuoteError(undefined);
      return;
    }
    const seq = ++quoteSeq.current;
    setIsQuoting(true);
    try {
      let nextQuote: SwapQuote;
      if (isJupiter) {
        const jupiterQuote = await getJupiterQuote({
          inputMint: SOL_MINT,
          outputMint: USDC_MINT,
          amount: sellRaw,
          platformFeeBps: feeBps || undefined,
          slippageBps: SLIPPAGE_BPS,
        });
        nextQuote = {
          outAmount: jupiterQuote.outAmount,
          minOut: jupiterQuote.otherAmountThreshold,
          feeAmount: jupiterQuote.platformFee?.amount ?? undefined,
          priceImpactPct: jupiterQuote.priceImpactPct,
          jupiter: jupiterQuote,
        };
      } else if (aggregator === "kyberswap") {
        const { routeSummary } = await getKyberRoute({
          amount: sellRaw,
          feeBps: feeBps || undefined,
          feeReceiver: activeFeeRecipient,
        });
        const out = BigInt(routeSummary.amountOut);
        nextQuote = {
          outAmount: routeSummary.amountOut,
          minOut: (
            (out * BigInt(10000 - KYBER_SLIPPAGE_BPS)) /
            10000n
          ).toString(),
          // amountOut is net of the fee (charged on currency_out).
          feeAmount: feeBps
            ? ((out * BigInt(feeBps)) / BigInt(10000 - feeBps)).toString()
            : undefined,
        };
      } else if (aggregator === "uniswap") {
        if (!evmAddress) {
          // The Trading API requires a swapper address on /quote.
          setQuote(undefined);
          setQuoteError("Connect a wallet to get Uniswap quotes");
          return;
        }
        const response = await getUniswapQuote({
          amount: sellRaw,
          swapper: evmAddress,
          feeBps: feeBps || undefined,
          feeRecipient: activeFeeRecipient,
          slippagePercent: SLIPPAGE_BPS / 100,
        });
        const gross = BigInt(response.quote.output?.amount ?? "0");
        // For EXACT_INPUT the quoted output does not subtract the fee; the
        // fee is reported separately as portionAmount.
        const fee = BigInt(response.quote.portionAmount ?? "0");
        const net = gross - fee;
        nextQuote = {
          outAmount: net.toString(),
          minOut: ((net * BigInt(10000 - SLIPPAGE_BPS)) / 10000n).toString(),
          feeAmount: response.quote.portionAmount ?? undefined,
          priceImpactPct:
            response.quote.priceImpact !== undefined
              ? String(response.quote.priceImpact)
              : undefined,
          uniswap: response.quote,
        };
      } else {
        const { dstAmount } = await getOneInchQuote({
          amount: sellRaw,
          feeBps: feeBps || undefined,
          referrer: activeFeeRecipient,
        });
        const out = BigInt(dstAmount);
        nextQuote = {
          outAmount: dstAmount,
          minOut: ((out * BigInt(10000 - SLIPPAGE_BPS)) / 10000n).toString(),
          // dstAmount is net of the fee; back out the fee for display.
          feeAmount: feeBps
            ? ((out * BigInt(feeBps)) / BigInt(10000 - feeBps)).toString()
            : undefined,
        };
      }
      if (seq === quoteSeq.current) {
        setQuote(nextQuote);
        setQuoteError(undefined);
      }
    } catch (error) {
      console.error(error);
      if (seq === quoteSeq.current) {
        setQuote(undefined);
        setQuoteError((error as Error).message);
      }
    } finally {
      if (seq === quoteSeq.current) setIsQuoting(false);
    }
  }, [sellRaw, isJupiter, aggregator, feeBps, activeFeeRecipient, evmAddress]);

  // Debounced fetch on input change + periodic refresh to keep quotes fresh.
  useEffect(() => {
    const debounce = setTimeout(refreshQuote, 500);
    const interval = setInterval(refreshQuote, 30_000);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [refreshQuote]);

  const onSelectAggregator = useCallback((next: AggregatorId) => {
    localStorage.setItem("session_fees_aggregator", next);
    setAggregator(next);
    setSellAmount("");
    setQuote(undefined);
    setQuoteError(undefined);
    setLastTxId(undefined);
  }, []);

  // -------- token prices (cosmetic cards) --------
  const [prices, setPrices] = useState<
    Record<string, { usdPrice: number; priceChange24h?: number }>
  >({});

  useEffect(() => {
    let active = true;
    const fetchPrices = async () => {
      try {
        if (isJupiter) {
          const result = await getJupiterPrices([SOL_MINT, USDC_MINT]);
          if (active) {
            setPrices({
              sell: result[SOL_MINT],
              usdc: result[USDC_MINT],
            });
          }
        } else {
          const result = await getEvmPrices();
          if (active) {
            setPrices({ sell: result.ETH, usdc: result.USDC });
          }
        }
      } catch (error) {
        // Price cards are cosmetic; ignore failures.
        console.warn("price fetch failed", error);
      }
    };
    setPrices({});
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isJupiter]);

  // -------- fee recipient balance (watch fees arrive) --------
  const [feeBalance, setFeeBalance] = useState<string>();
  const [feeAtaExists, setFeeAtaExists] = useState<boolean>();

  const refreshFeeBalance = useCallback(async () => {
    if (isJupiter) {
      if (!feeAta) return;
      try {
        const balance = await solanaConnection.getTokenAccountBalance(feeAta);
        setFeeBalance(balance.value.uiAmountString ?? "0");
        setFeeAtaExists(true);
      } catch (error) {
        // getTokenAccountBalance throws if the ATA is not initialized yet.
        setFeeAtaExists(false);
        setFeeBalance(undefined);
      }
    } else {
      if (!feeTerms?.feeRecipientEip155) return;
      try {
        const usdc = new Contract(ARBITRUM_USDC, ERC20_ABI, evmProvider);
        const balance = await usdc.balanceOf(feeTerms.feeRecipientEip155);
        setFeeBalance(formatUnits(balance, USDC_DECIMALS));
        setFeeAtaExists(true);
      } catch (error) {
        console.warn("fee balance fetch failed", error);
      }
    }
  }, [isJupiter, feeAta, feeTerms, solanaConnection, evmProvider]);

  useEffect(() => {
    setFeeBalance(undefined);
    setFeeAtaExists(undefined);
    refreshFeeBalance();
    const interval = setInterval(refreshFeeBalance, 15_000);
    return () => clearInterval(interval);
  }, [refreshFeeBalance]);

  // -------- connected account's sell-token balance --------
  const [sellBalanceRaw, setSellBalanceRaw] = useState<bigint>();

  const refreshSellBalance = useCallback(async () => {
    if (!activeAddress) {
      setSellBalanceRaw(undefined);
      return;
    }
    try {
      if (isJupiter) {
        const lamports = await solanaConnection.getBalance(
          new PublicKey(activeAddress),
        );
        setSellBalanceRaw(BigInt(lamports));
      } else {
        setSellBalanceRaw(await evmProvider.getBalance(activeAddress));
      }
    } catch (error) {
      console.warn("sell balance fetch failed", error);
    }
  }, [activeAddress, isJupiter, solanaConnection, evmProvider]);

  useEffect(() => {
    setSellBalanceRaw(undefined);
    refreshSellBalance();
    const interval = setInterval(refreshSellBalance, 30_000);
    return () => clearInterval(interval);
  }, [refreshSellBalance]);

  const hasInsufficientBalance =
    sellRaw !== undefined &&
    sellBalanceRaw !== undefined &&
    BigInt(sellRaw) > sellBalanceRaw;

  // -------- swap --------
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [lastTxId, setLastTxId] = useState<string>();
  const [isConnecting, setIsConnecting] = useState(false);

  const onConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      // ClientContext already toasts the error.
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const waitForSolanaConfirmation = useCallback(
    async (signature: string) => {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const { value } = await solanaConnection.getSignatureStatuses([
          signature,
        ]);
        const status = value[0];
        if (status?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
        }
        if (
          status?.confirmationStatus === "confirmed" ||
          status?.confirmationStatus === "finalized"
        ) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      throw new Error("Timed out waiting for confirmation");
    },
    [solanaConnection],
  );

  const swapWithJupiter = useCallback(async () => {
    if (!client || !session || !solanaAddress || !quote?.jupiter) return;
    setPhase("building");
    const { swapTransaction } = await buildJupiterSwapTransaction({
      quoteResponse: quote.jupiter,
      userPublicKey: solanaAddress,
      feeAccount: feeBps ? feeAta?.toBase58() : undefined,
    });

    setPhase("signing");
    const { transaction: signedTransaction } = await client.request<{
      transaction: string;
      signature: string;
    }>({
      topic: session.topic,
      chainId: SOLANA_MAINNET_CAIP,
      request: {
        method: "solana_signTransaction",
        params: { pubkey: solanaAddress, transaction: swapTransaction },
      },
    });

    setPhase("sending");
    const signature = await solanaConnection.sendRawTransaction(
      base64ToBytes(signedTransaction),
      { maxRetries: 3, preflightCommitment: "confirmed" },
    );

    setPhase("confirming");
    await waitForSolanaConfirmation(signature);
    setLastTxId(signature);
  }, [
    client,
    session,
    solanaAddress,
    quote,
    feeBps,
    feeAta,
    solanaConnection,
    waitForSolanaConfirmation,
  ]);

  const swapWithOneInch = useCallback(async () => {
    if (!client || !session || !evmAddress || !sellRaw) return;
    setPhase("building");
    const { tx } = await buildOneInchSwap({
      amount: sellRaw,
      from: evmAddress,
      feeBps: feeBps || undefined,
      referrer: activeFeeRecipient,
      slippagePercent: SLIPPAGE_BPS / 100,
    });

    setPhase("signing");
    const hash = await client.request<string>({
      topic: session.topic,
      chainId: ARBITRUM_CAIP,
      request: {
        method: "eth_sendTransaction",
        params: [toWalletConnectTx(tx)],
      },
    });

    setPhase("confirming");
    const receipt = await evmProvider.waitForTransaction(hash, 1, 120_000);
    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed or timed out");
    }
    setLastTxId(hash);
  }, [
    client,
    session,
    evmAddress,
    sellRaw,
    feeBps,
    activeFeeRecipient,
    evmProvider,
  ]);

  const swapWithKyberSwap = useCallback(async () => {
    if (!client || !session || !evmAddress || !sellRaw) return;
    setPhase("building");
    // Kyber routes reference exact pool states and go stale within seconds —
    // fetch a fresh route at swap time instead of reusing the displayed quote.
    const { routeSummary } = await getKyberRoute({
      amount: sellRaw,
      feeBps: feeBps || undefined,
      feeReceiver: activeFeeRecipient,
    });
    const build = await buildKyberSwap({
      routeSummary,
      sender: evmAddress,
      slippageBps: KYBER_SLIPPAGE_BPS,
    });

    setPhase("signing");
    const hash = await client.request<string>({
      topic: session.topic,
      chainId: ARBITRUM_CAIP,
      request: {
        method: "eth_sendTransaction",
        params: [kyberToWalletConnectTx(evmAddress, build)],
      },
    });

    setPhase("confirming");
    const receipt = await evmProvider.waitForTransaction(hash, 1, 120_000);
    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed or timed out");
    }
    setLastTxId(hash);
  }, [
    client,
    session,
    evmAddress,
    sellRaw,
    feeBps,
    activeFeeRecipient,
    evmProvider,
  ]);

  const swapWithUniswap = useCallback(async () => {
    if (!client || !session || !evmAddress || !quote?.uniswap) return;
    setPhase("building");
    const { swap } = await buildUniswapSwap({ quote: quote.uniswap });

    setPhase("signing");
    const hash = await client.request<string>({
      topic: session.topic,
      chainId: ARBITRUM_CAIP,
      request: {
        method: "eth_sendTransaction",
        params: [uniswapToWalletConnectTx(swap)],
      },
    });

    setPhase("confirming");
    const receipt = await evmProvider.waitForTransaction(hash, 1, 120_000);
    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed or timed out");
    }
    setLastTxId(hash);
  }, [client, session, evmAddress, quote, evmProvider]);

  const onSwap = useCallback(async () => {
    try {
      setLastTxId(undefined);
      if (isJupiter) {
        await swapWithJupiter();
      } else if (aggregator === "kyberswap") {
        await swapWithKyberSwap();
      } else if (aggregator === "uniswap") {
        await swapWithUniswap();
      } else {
        await swapWithOneInch();
      }
      toast.success("Swap confirmed!", { position: "bottom-left" });
      refreshFeeBalance();
      refreshSellBalance();
      refreshQuote();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message, { position: "bottom-left" });
    } finally {
      setPhase("idle");
    }
  }, [
    isJupiter,
    aggregator,
    swapWithJupiter,
    swapWithKyberSwap,
    swapWithUniswap,
    swapWithOneInch,
    refreshFeeBalance,
    refreshSellBalance,
    refreshQuote,
  ]);

  // -------- derived display values --------
  const sellPrice = prices.sell?.usdPrice;
  const usdcPrice = prices.usdc?.usdPrice;
  const sellUsd =
    sellPrice && sellRaw
      ? Number(formatUnits(BigInt(sellRaw), agg.sellDecimals)) * sellPrice
      : undefined;
  const buyAmount = quote
    ? formatTokenAmount(quote.outAmount, USDC_DECIMALS)
    : "";
  const buyUsd =
    quote && usdcPrice
      ? (Number(quote.outAmount) / 10 ** USDC_DECIMALS) * usdcPrice
      : undefined;
  const feeAmount = quote?.feeAmount
    ? formatTokenAmount(quote.feeAmount, USDC_DECIMALS)
    : undefined;
  const feeBalanceAddress = isJupiter
    ? feeAta?.toBase58()
    : feeTerms?.feeRecipientEip155;

  const shortAddress = (address: string) =>
    `${address.slice(0, 4)}…${address.slice(-4)}`;

  const isSwapping = phase !== "idle";
  const canSwap =
    !!session &&
    !!activeAddress &&
    !!quote &&
    !isSwapping &&
    !hasInsufficientBalance;

  return (
    <SPage>
      <STopBar>
        <SLogo>
          <SLogoMark>◎</SLogoMark> Session Fees <SPocBadge>POC</SPocBadge>
        </SLogo>
        {session && activeAddress ? (
          <SAccountChip onClick={() => disconnect()}>
            {shortAddress(activeAddress)} ✕
          </SAccountChip>
        ) : null}
      </STopBar>

      <SMain>
        <STabsRow>
          <STab $active>Market</STab>
          <SAggregatorSelect
            value={aggregator}
            onChange={(event) =>
              onSelectAggregator(event.target.value as AggregatorId)
            }
            disabled={isSwapping}
          >
            {Object.entries(AGGREGATORS).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label} · {meta.chainLabel}
              </option>
            ))}
          </SAggregatorSelect>
        </STabsRow>

        <SCard>
          <SPanel>
            <SPanelLabel>Selling</SPanelLabel>
            <SPanelRow>
              <STokenChip>
                <STokenIcon $color={agg.sellColor}>{agg.sellIcon}</STokenIcon>{" "}
                {agg.sellSymbol}
              </STokenChip>
              <SAmountInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={sellAmount}
                onChange={(event) => setSellAmount(event.target.value)}
                disabled={isSwapping}
              />
            </SPanelRow>
            <SPanelFooter>
              <SBalanceValue $insufficient={hasInsufficientBalance}>
                {session && activeAddress && sellBalanceRaw !== undefined
                  ? `Balance: ${Number(
                      formatUnits(sellBalanceRaw, agg.sellDecimals),
                    ).toFixed(5)} ${agg.sellSymbol}`
                  : " "}
              </SBalanceValue>
              <SUsdValue>
                {sellUsd !== undefined ? `$${sellUsd.toFixed(2)}` : " "}
              </SUsdValue>
            </SPanelFooter>
          </SPanel>

          <SArrowDivider>
            <SArrowCircle>↓</SArrowCircle>
          </SArrowDivider>

          <SPanel>
            <SPanelLabel>Buying</SPanelLabel>
            <SPanelRow>
              <STokenChip>
                <STokenIcon $color="#2775CA">$</STokenIcon> USDC
              </STokenChip>
              <SAmountOutput $dim={isQuoting}>{buyAmount || "0"}</SAmountOutput>
            </SPanelRow>
            <SUsdValue>
              {buyUsd !== undefined ? `$${buyUsd.toFixed(2)}` : " "}
            </SUsdValue>
          </SPanel>

          {session ? (
            feeTerms && activeFeeRecipient ? (
              <SFeeTerms>
                <SFeeTermsHeader>
                  Session fee terms <SFeeBadge>from wallet</SFeeBadge>
                </SFeeTermsHeader>
                <SBreakdownRow>
                  <span>
                    Fee {(feeBps / 100).toFixed(2)}% — {FEE_SPLIT_LABEL}
                  </span>
                  <span>{feeAmount ? `${feeAmount} USDC` : "—"}</span>
                </SBreakdownRow>
                <SBreakdownRow>
                  <span>Fee recipient ({agg.chainLabel})</span>
                  <SMono>{shortAddress(activeFeeRecipient)}</SMono>
                </SBreakdownRow>
                {isJupiter && feeAtaExists === false && (
                  <SWarning>
                    Fee recipient&apos;s USDC token account is not initialized —
                    Jupiter will skip fee collection for this swap.
                  </SWarning>
                )}
              </SFeeTerms>
            ) : (
              <SFeeTerms>
                <SFeeTermsHeader>Session fee terms</SFeeTermsHeader>
                <SNoTerms>
                  No {agg.chainLabel} fee terms declared by the wallet —
                  swapping without a fee.
                </SNoTerms>
              </SFeeTerms>
            )
          ) : null}

          {session && !activeAddress && (
            <SWarning>
              The current session has no {agg.chainLabel} account. Disconnect
              and reconnect to approve both chains.
            </SWarning>
          )}

          {quote && (
            <SBreakdown>
              <SBreakdownRow>
                <span>You receive</span>
                <span>{buyAmount} USDC</span>
              </SBreakdownRow>
              <SBreakdownRow>
                <span>
                  Min. received (
                  {(aggregator === "kyberswap"
                    ? KYBER_SLIPPAGE_BPS
                    : SLIPPAGE_BPS) / 100}
                  % slippage)
                </span>
                <span>
                  {formatTokenAmount(quote.minOut, USDC_DECIMALS)} USDC
                </span>
              </SBreakdownRow>
              {quote.priceImpactPct !== undefined && (
                <SBreakdownRow>
                  <span>Price impact</span>
                  <span>{Number(quote.priceImpactPct ?? 0).toFixed(4)}%</span>
                </SBreakdownRow>
              )}
            </SBreakdown>
          )}

          {quoteError && <SWarning>Quote error: {quoteError}</SWarning>}

          {!session ? (
            <SBigButton
              onClick={onConnect}
              disabled={isInitializing || isConnecting}
            >
              {isInitializing || isConnecting ? "Connecting…" : "Connect"}
            </SBigButton>
          ) : (
            <SBigButton onClick={onSwap} disabled={!canSwap}>
              {hasInsufficientBalance && !isSwapping
                ? `Insufficient ${agg.sellSymbol} balance`
                : PHASE_LABELS[phase]}
            </SBigButton>
          )}
        </SCard>

        <SPriceRow>
          <SPriceCard>
            <SPriceCardToken>
              <STokenIcon $color={agg.sellColor}>{agg.sellIcon}</STokenIcon>{" "}
              {agg.sellSymbol}
            </SPriceCardToken>
            <SPriceCardValue>
              {sellPrice ? `$${sellPrice.toFixed(2)}` : "—"}
            </SPriceCardValue>
            <SPriceCardChange
              $negative={(prices.sell?.priceChange24h ?? 0) < 0}
            >
              {prices.sell?.priceChange24h !== undefined
                ? `${prices.sell.priceChange24h!.toFixed(2)}% (24h)`
                : ""}
            </SPriceCardChange>
          </SPriceCard>
          <SPriceCard>
            <SPriceCardToken>
              <STokenIcon $color="#2775CA">$</STokenIcon> USDC
            </SPriceCardToken>
            <SPriceCardValue>
              {usdcPrice ? `$${usdcPrice.toFixed(4)}` : "—"}
            </SPriceCardValue>
            <SPriceCardChange
              $negative={(prices.usdc?.priceChange24h ?? 0) < 0}
            >
              {prices.usdc?.priceChange24h !== undefined
                ? `${prices.usdc.priceChange24h!.toFixed(2)}% (24h)`
                : ""}
            </SPriceCardChange>
          </SPriceCard>
        </SPriceRow>

        {lastTxId && (
          <SResultCard>
            <SFeeTermsHeader>Swap confirmed ✅</SFeeTermsHeader>
            <SBreakdownRow>
              <span>Transaction</span>
              <SLink
                href={agg.explorerTx(lastTxId)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(lastTxId)} ↗
              </SLink>
            </SBreakdownRow>
          </SResultCard>
        )}

        {activeFeeRecipient && feeBalanceAddress && (
          <SResultCard>
            <SFeeTermsHeader>
              Fee recipient balance <SFeeBadge>live</SFeeBadge>
            </SFeeTermsHeader>
            <SBreakdownRow>
              <span>USDC collected</span>
              <SFeeBalanceValue>
                {isJupiter && feeAtaExists === false
                  ? "token account not initialized"
                  : feeBalance !== undefined
                    ? `${feeBalance} USDC`
                    : "…"}
              </SFeeBalanceValue>
            </SBreakdownRow>
            <SBreakdownRow>
              <span>{isJupiter ? "Fee token account" : "Fee recipient"}</span>
              <SLink
                href={agg.explorerAddress(feeBalanceAddress)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(feeBalanceAddress)} ↗
              </SLink>
            </SBreakdownRow>
          </SResultCard>
        )}
      </SMain>
    </SPage>
  );
};

export default Home;

/**
 * Styles — dark, Jupiter-like.
 */

const SPage = styled.div`
  min-height: 100vh;
  background: #0c0f14;
  color: #e8f9ff;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    sans-serif;
`;

const STopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #1b232d;
`;

const SLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
`;

const SLogoMark = styled.span`
  color: #c7f284;
`;

const SPocBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #c7f284;
  border: 1px solid #c7f284;
  border-radius: 6px;
  padding: 1px 6px;
`;

const SAccountChip = styled.button`
  background: #1b232d;
  color: #e8f9ff;
  border: 1px solid #2a3441;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  &:hover {
    border-color: #c7f284;
  }
`;

const SMain = styled.main`
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 16px 64px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const STabsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const STab = styled.div<{ $active?: boolean }>`
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? "#1b232d" : "transparent")};
  color: ${({ $active }) => ($active ? "#c7f284" : "#5b6b7c")};
`;

const SAggregatorSelect = styled.select`
  background: #1b232d;
  color: #e8f9ff;
  border: 1px solid #2a3441;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  &:hover {
    border-color: #c7f284;
  }
`;

const SCard = styled.div`
  background: #131920;
  border: 1px solid #1b232d;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SPanel = styled.div`
  background: #0f141a;
  border: 1px solid #1b232d;
  border-radius: 12px;
  padding: 12px 16px;
`;

const SPanelLabel = styled.div`
  font-size: 12px;
  color: #5b6b7c;
  margin-bottom: 8px;
`;

const SPanelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const STokenChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1b232d;
  border-radius: 20px;
  padding: 6px 14px 6px 6px;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
`;

const STokenIcon = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  color: white;
  font-size: 14px;
  font-weight: 700;
`;

const SAmountInput = styled.input`
  background: transparent;
  border: none;
  outline: none;
  color: #e8f9ff;
  font-size: 26px;
  font-weight: 600;
  text-align: right;
  width: 100%;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
  -moz-appearance: textfield;
  appearance: textfield;
`;

const SAmountOutput = styled.div<{ $dim?: boolean }>`
  font-size: 26px;
  font-weight: 600;
  text-align: right;
  color: ${({ $dim }) => ($dim ? "#5b6b7c" : "#e8f9ff")};
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SUsdValue = styled.div`
  font-size: 12px;
  color: #5b6b7c;
  text-align: right;
  margin-top: 4px;
`;

const SPanelFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SBalanceValue = styled.div<{ $insufficient?: boolean }>`
  font-size: 12px;
  color: ${({ $insufficient }) => ($insufficient ? "#ffb86b" : "#5b6b7c")};
  margin-top: 4px;
`;

const SArrowDivider = styled.div`
  display: flex;
  justify-content: center;
  margin: -14px 0;
  z-index: 1;
`;

const SArrowCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1b232d;
  border: 3px solid #131920;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c7f284;
  font-size: 15px;
`;

const SFeeTerms = styled.div`
  background: #0f141a;
  border: 1px dashed #2a3441;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SFeeTermsHeader = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #c7f284;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SFeeBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #5b6b7c;
  border: 1px solid #2a3441;
  border-radius: 6px;
  padding: 1px 6px;
`;

const SNoTerms = styled.div`
  font-size: 13px;
  color: #5b6b7c;
`;

const SBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 16px;
`;

const SBreakdownRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #8fa3b5;
  span:last-child {
    color: #e8f9ff;
  }
`;

const SMono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`;

const SWarning = styled.div`
  font-size: 12px;
  color: #ffb86b;
  background: rgba(255, 184, 107, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
`;

const SBigButton = styled.button`
  margin-top: 4px;
  background: #c7f284;
  color: #0c0f14;
  font-size: 17px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: opacity 0.15s ease;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SPriceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const SPriceCard = styled.div`
  background: #131920;
  border: 1px solid #1b232d;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SPriceCardToken = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
`;

const SPriceCardValue = styled.div`
  font-size: 20px;
  font-weight: 700;
`;

const SPriceCardChange = styled.div<{ $negative?: boolean }>`
  font-size: 12px;
  color: ${({ $negative }) => ($negative ? "#ff6b6b" : "#7ee787")};
  min-height: 14px;
`;

const SResultCard = styled.div`
  background: #131920;
  border: 1px solid #1b232d;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SLink = styled.a`
  color: #c7f284;
  text-decoration: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  &:hover {
    text-decoration: underline;
  }
`;

const SFeeBalanceValue = styled.span`
  font-weight: 700;
  color: #c7f284 !important;
`;
