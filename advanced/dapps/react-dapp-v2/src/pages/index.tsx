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
import { Connection } from "@solana/web3.js";

import { useWalletConnectClient } from "../contexts/ClientContext";
import { getProviderUrl } from "../helpers";
import {
  base64ToBytes,
  buildJupiterSwapTransaction,
  formatTokenAmount,
  getAssociatedTokenAddress,
  getJupiterPrices,
  getJupiterQuote,
  JupiterQuote,
  JUPITER_MAX_FEE_BPS,
  parseFeeTerms,
  SOL_DECIMALS,
  SOL_MINT,
  SOLANA_MAINNET_CAIP,
  USDC_DECIMALS,
  USDC_MINT,
} from "../helpers/jupiter";

/**
 * Session Fees POC — single swap screen (SOL -> USDC via Jupiter).
 *
 * The wallet declares fee terms in `sessionProperties.wc_feeTerms` at session
 * approval; this dapp reads them and passes them as an integrator fee
 * (platformFeeBps + feeAccount) into Jupiter's quote/swap endpoints. The fee
 * is baked into the swap transaction — the user signs once.
 */

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || getProviderUrl(SOLANA_MAINNET_CAIP);

const SLIPPAGE_BPS = 50;
// UI label only for the POC — no split contract exists.
const FEE_SPLIT_LABEL = "80% wallet / 20% WCN";

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

  const connection = useMemo(() => new Connection(SOLANA_RPC_URL), []);

  // This demo is Solana-mainnet only.
  useEffect(() => {
    setChains([SOLANA_MAINNET_CAIP]);
  }, [setChains]);

  const solanaAddress = useMemo(
    () =>
      accounts.find((account) => account.startsWith("solana:"))?.split(":")[2],
    [accounts],
  );

  // -------- fee terms from the session --------
  const feeTerms = useMemo(
    () => parseFeeTerms(session?.sessionProperties),
    [session],
  );
  const feeBps = feeTerms ? Math.min(feeTerms.feeBps, JUPITER_MAX_FEE_BPS) : 0;
  // Jupiter collects the fee into a token account: the recipient's USDC ATA.
  const feeAta = useMemo(
    () =>
      feeTerms
        ? getAssociatedTokenAddress(feeTerms.feeRecipient, USDC_MINT)
        : undefined,
    [feeTerms],
  );

  // -------- quote --------
  const [sellAmount, setSellAmount] = useState("0.02");
  const [quote, setQuote] = useState<JupiterQuote>();
  const [quoteError, setQuoteError] = useState<string>();
  const [isQuoting, setIsQuoting] = useState(false);
  const quoteSeq = useRef(0);

  const sellLamports = useMemo(() => {
    const parsed = parseFloat(sellAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.round(parsed * 10 ** SOL_DECIMALS);
  }, [sellAmount]);

  const refreshQuote = useCallback(async () => {
    if (!sellLamports) {
      setQuote(undefined);
      setQuoteError(undefined);
      return;
    }
    const seq = ++quoteSeq.current;
    setIsQuoting(true);
    try {
      const nextQuote = await getJupiterQuote({
        inputMint: SOL_MINT,
        outputMint: USDC_MINT,
        amount: String(sellLamports),
        platformFeeBps: feeBps || undefined,
        slippageBps: SLIPPAGE_BPS,
      });
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
  }, [sellLamports, feeBps]);

  // Debounced fetch on input change + periodic refresh to keep quotes fresh.
  useEffect(() => {
    const debounce = setTimeout(refreshQuote, 500);
    const interval = setInterval(refreshQuote, 30_000);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [refreshQuote]);

  // -------- token prices (cosmetic cards) --------
  const [prices, setPrices] = useState<
    Record<string, { usdPrice: number; priceChange24h?: number }>
  >({});

  useEffect(() => {
    let active = true;
    const fetchPrices = async () => {
      try {
        const result = await getJupiterPrices([SOL_MINT, USDC_MINT]);
        if (active) setPrices(result);
      } catch (error) {
        // Price cards are cosmetic; ignore failures.
        console.warn("price fetch failed", error);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // -------- fee recipient balance (watch fees arrive) --------
  const [feeBalance, setFeeBalance] = useState<string>();
  const [feeAtaExists, setFeeAtaExists] = useState<boolean>();

  const refreshFeeBalance = useCallback(async () => {
    if (!feeAta) return;
    try {
      const balance = await connection.getTokenAccountBalance(feeAta);
      setFeeBalance(balance.value.uiAmountString ?? "0");
      setFeeAtaExists(true);
    } catch (error) {
      // getTokenAccountBalance throws if the ATA is not initialized yet.
      setFeeAtaExists(false);
      setFeeBalance(undefined);
    }
  }, [connection, feeAta]);

  useEffect(() => {
    refreshFeeBalance();
    const interval = setInterval(refreshFeeBalance, 15_000);
    return () => clearInterval(interval);
  }, [refreshFeeBalance]);

  // -------- swap --------
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [lastSignature, setLastSignature] = useState<string>();
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

  const waitForConfirmation = useCallback(
    async (signature: string) => {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const { value } = await connection.getSignatureStatuses([signature]);
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
    [connection],
  );

  const onSwap = useCallback(async () => {
    if (!client || !session || !solanaAddress || !quote) return;
    try {
      setLastSignature(undefined);
      setPhase("building");
      const { swapTransaction } = await buildJupiterSwapTransaction({
        quoteResponse: quote,
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
          params: {
            pubkey: solanaAddress,
            transaction: swapTransaction,
          },
        },
      });

      setPhase("sending");
      const signature = await connection.sendRawTransaction(
        base64ToBytes(signedTransaction),
        { maxRetries: 3, preflightCommitment: "confirmed" },
      );

      setPhase("confirming");
      await waitForConfirmation(signature);

      setLastSignature(signature);
      toast.success("Swap confirmed!", { position: "bottom-left" });
      refreshFeeBalance();
      refreshQuote();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message, { position: "bottom-left" });
    } finally {
      setPhase("idle");
    }
  }, [
    client,
    session,
    solanaAddress,
    quote,
    feeBps,
    feeAta,
    connection,
    waitForConfirmation,
    refreshFeeBalance,
    refreshQuote,
  ]);

  // -------- derived display values --------
  const solPrice = prices[SOL_MINT]?.usdPrice;
  const usdcPrice = prices[USDC_MINT]?.usdPrice;
  const sellUsd =
    solPrice && sellLamports
      ? (sellLamports / 10 ** SOL_DECIMALS) * solPrice
      : undefined;
  const buyAmount = quote
    ? formatTokenAmount(quote.outAmount, USDC_DECIMALS)
    : "";
  const buyUsd =
    quote && usdcPrice
      ? (Number(quote.outAmount) / 10 ** USDC_DECIMALS) * usdcPrice
      : undefined;
  const feeAmount = quote?.platformFee
    ? formatTokenAmount(quote.platformFee.amount, USDC_DECIMALS)
    : undefined;

  const shortAddress = (address: string) =>
    `${address.slice(0, 4)}…${address.slice(-4)}`;

  const isSwapping = phase !== "idle";
  const canSwap = !!session && !!quote && !isSwapping;

  return (
    <SPage>
      <STopBar>
        <SLogo>
          <SLogoMark>◎</SLogoMark> Session Fees <SPocBadge>POC</SPocBadge>
        </SLogo>
        {session && solanaAddress ? (
          <SAccountChip onClick={() => disconnect()}>
            {shortAddress(solanaAddress)} ✕
          </SAccountChip>
        ) : null}
      </STopBar>

      <SMain>
        <STabs>
          <STab $active>Market</STab>
        </STabs>

        <SCard>
          <SPanel>
            <SPanelLabel>Selling</SPanelLabel>
            <SPanelRow>
              <STokenChip>
                <STokenIcon $color="#9945FF">◎</STokenIcon> SOL
              </STokenChip>
              <SAmountInput
                type="number"
                min="0"
                step="0.01"
                value={sellAmount}
                onChange={(event) => setSellAmount(event.target.value)}
                disabled={isSwapping}
              />
            </SPanelRow>
            <SUsdValue>
              {sellUsd !== undefined ? `$${sellUsd.toFixed(2)}` : " "}
            </SUsdValue>
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
              {buyUsd !== undefined ? `$${buyUsd.toFixed(2)}` : " "}
            </SUsdValue>
          </SPanel>

          {session ? (
            feeTerms ? (
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
                  <span>Fee recipient</span>
                  <SMono>{shortAddress(feeTerms.feeRecipient)}</SMono>
                </SBreakdownRow>
                {feeAtaExists === false && (
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
                  No fee terms declared by the wallet — swapping without a fee.
                </SNoTerms>
              </SFeeTerms>
            )
          ) : null}

          {quote && (
            <SBreakdown>
              <SBreakdownRow>
                <span>You receive</span>
                <span>{buyAmount} USDC</span>
              </SBreakdownRow>
              <SBreakdownRow>
                <span>Min. received ({SLIPPAGE_BPS / 100}% slippage)</span>
                <span>
                  {formatTokenAmount(quote.otherAmountThreshold, USDC_DECIMALS)}{" "}
                  USDC
                </span>
              </SBreakdownRow>
              <SBreakdownRow>
                <span>Price impact</span>
                <span>{Number(quote.priceImpactPct ?? 0).toFixed(4)}%</span>
              </SBreakdownRow>
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
              {PHASE_LABELS[phase]}
            </SBigButton>
          )}
        </SCard>

        <SPriceRow>
          <SPriceCard>
            <SPriceCardToken>
              <STokenIcon $color="#9945FF">◎</STokenIcon> SOL
            </SPriceCardToken>
            <SPriceCardValue>
              {solPrice ? `$${solPrice.toFixed(2)}` : "—"}
            </SPriceCardValue>
            <SPriceCardChange
              $negative={(prices[SOL_MINT]?.priceChange24h ?? 0) < 0}
            >
              {prices[SOL_MINT]?.priceChange24h !== undefined
                ? `${prices[SOL_MINT].priceChange24h!.toFixed(2)}% (24h)`
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
              $negative={(prices[USDC_MINT]?.priceChange24h ?? 0) < 0}
            >
              {prices[USDC_MINT]?.priceChange24h !== undefined
                ? `${prices[USDC_MINT].priceChange24h!.toFixed(2)}% (24h)`
                : ""}
            </SPriceCardChange>
          </SPriceCard>
        </SPriceRow>

        {lastSignature && (
          <SResultCard>
            <SFeeTermsHeader>Swap confirmed ✅</SFeeTermsHeader>
            <SBreakdownRow>
              <span>Transaction</span>
              <SLink
                href={`https://solscan.io/tx/${lastSignature}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(lastSignature)} ↗
              </SLink>
            </SBreakdownRow>
          </SResultCard>
        )}

        {feeTerms && feeAta && (
          <SResultCard>
            <SFeeTermsHeader>
              Fee recipient balance <SFeeBadge>live</SFeeBadge>
            </SFeeTermsHeader>
            <SBreakdownRow>
              <span>USDC collected</span>
              <SFeeBalanceValue>
                {feeAtaExists === false
                  ? "token account not initialized"
                  : feeBalance !== undefined
                    ? `${feeBalance} USDC`
                    : "…"}
              </SFeeBalanceValue>
            </SBreakdownRow>
            <SBreakdownRow>
              <span>Fee token account</span>
              <SLink
                href={`https://solscan.io/account/${feeAta.toBase58()}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(feeAta.toBase58())} ↗
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

const STabs = styled.div`
  display: flex;
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
