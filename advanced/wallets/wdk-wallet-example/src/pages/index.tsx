import { useState } from "react";
import Head from "next/head";
import { useSnapshot } from "valtio";
import { getSdkError } from "@walletconnect/utils";
import useInitialization from "@/hooks/useInitialization";
import useWalletConnectEventsManager from "@/hooks/useWalletConnectEventsManager";
import SettingsStore from "@/store/SettingsStore";
import { walletkit, isPaymentLink } from "@/utils/walletConnect";
import ModalStore from "@/store/ModalStore";
import PaymentStore from "@/store/PaymentStore";
import { EVM_CHAINS, SOLANA_CHAINS } from "@/config/chains";
import Modal from "@/components/Modal";
import CopyButton from "@/components/CopyButton";

function short(address: string, lead = 6, tail = 6) {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export default function HomePage() {
  const initialized = useInitialization();
  useWalletConnectEventsManager(initialized);

  const { accounts, sessions, error } = useSnapshot(SettingsStore.state);
  const [uri, setUri] = useState("");
  const [pairing, setPairing] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  async function onConnect() {
    const value = uri.trim();
    if (!value) return;

    // WalletConnect Pay links open the payment flow instead of pairing a session.
    if (isPaymentLink(value)) {
      await onPay(value);
      return;
    }

    setPairing(true);
    try {
      await walletkit.pair({ uri: value });
      setUri("");
    } catch (e) {
      console.error("Pairing failed", e);
      alert(`Pairing failed: ${(e as Error).message}`);
    } finally {
      setPairing(false);
    }
  }

  async function onPay(paymentLink: string) {
    const payClient = walletkit?.pay;
    if (!payClient) {
      alert("Pay SDK not initialized.");
      return;
    }
    if (!accounts) return;

    PaymentStore.startPayment({ loadingMessage: "Preparing your payment…" });
    ModalStore.open("Payment", {});
    setUri("");

    try {
      // Offer the wallet's accounts (CAIP-10) on every supported chain; the Pay
      // backend returns the stablecoin options the buyer can actually settle with.
      const payAccounts = [
        ...Object.keys(EVM_CHAINS).map((chain) => `${chain}:${accounts.evm}`),
        ...[`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${accounts.solana}`],
      ];

      const paymentOptions = await payClient.getPaymentOptions({
        paymentLink,
        accounts: payAccounts,
        includePaymentInfo: true,
      });
      console.log("paymentOptions", paymentOptions);
      PaymentStore.setPaymentOptions(paymentOptions);
    } catch (e) {
      console.error("Failed to fetch payment options", e);
      PaymentStore.setError(
        (e as Error).message || "Failed to fetch payment options",
      );
    }
  }

  async function onDisconnect(topic: string) {
    try {
      await walletkit.disconnectSession({
        topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
    } catch (e) {
      console.error("Disconnect failed", e);
    }
    SettingsStore.setSessions(Object.values(walletkit.getActiveSessions()));
  }

  const accountRows = accounts
    ? [
        { label: "EVM", address: accounts.evm },
        { label: "Solana", address: accounts.solana },
        { label: "TON", address: accounts.ton },
      ]
    : [];

  return (
    <>
      <Head>
        <title>WDK Wallet Example</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="container">
        <div className="header">
          <div>
            <h1>WDK Wallet Example</h1>
            <div className="subtitle">
              Reown WalletKit · Tether WDK key handling
            </div>
          </div>
          <span className="chip">
            {initialized ? "Ready" : "Initializing…"}
          </span>
        </div>

        {error && <div className="banner error">{error}</div>}

        {!accounts && !error && (
          <div className="card">
            <span className="muted">Loading accounts…</span>
          </div>
        )}

        {accounts && (
          <div className="card">
            <h2>Accounts</h2>
            {accountRows.map((row) => (
              <div className="account-row" key={row.label}>
                <span className="chip">{row.label}</span>
                <span className="account-value">
                  <span className="mono" title={row.address}>
                    {short(row.address, 10, 8)}
                  </span>
                  <CopyButton value={row.address} />
                </span>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <button
                className="secondary"
                onClick={() => setShowSeed((value) => !value)}
              >
                {showSeed ? "Hide" : "Reveal"} seed phrase
              </button>
              {showSeed && (
                <p className="mono" style={{ marginTop: 12 }}>
                  {accounts.seedPhrase}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <h2>Connect a dApp or pay</h2>
          <div className="row">
            <input
              type="text"
              placeholder="Paste a WalletConnect or Pay URI"
              value={uri}
              onChange={(event) => setUri(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onConnect()}
            />
            <button
              onClick={onConnect}
              disabled={!initialized || pairing || !uri.trim()}
            >
              {pairing ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Active sessions ({sessions.length})</h2>
          {sessions.length === 0 && (
            <span className="muted">No active sessions.</span>
          )}
          {sessions.map((session) => (
            <div className="session-row" key={session.topic}>
              <div className="session-meta">
                {session.peer.metadata.icons?.[0] && (
                  <img
                    className="session-icon"
                    src={session.peer.metadata.icons[0]}
                    alt=""
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {session.peer.metadata.name || "Unknown dApp"}
                  </div>
                  <div className="muted mono">{session.peer.metadata.url}</div>
                </div>
              </div>
              <button
                className="danger"
                onClick={() => onDisconnect(session.topic)}
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      </main>

      <Modal />
    </>
  );
}
