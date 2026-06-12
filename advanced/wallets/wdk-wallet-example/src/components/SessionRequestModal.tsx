import { useState } from "react";
import { useSnapshot } from "valtio";
import { SignClientTypes } from "@walletconnect/types";
import ModalStore from "@/store/ModalStore";
import { walletkit } from "@/utils/walletConnect";
import { approveRequest, rejectRequest } from "@/utils/requestHandlers";
import { getChainMeta } from "@/config/chains";

export default function SessionRequestModal() {
  const { data } = useSnapshot(ModalStore.state);
  const requestEvent =
    data.requestEvent as SignClientTypes.EventArguments["session_request"];
  const requestSession = data.requestSession as any;
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { topic, params } = requestEvent;
  const { request, chainId } = params;
  const metadata = requestSession?.peer?.metadata;

  async function respond(
    getResponse: () => Promise<any> | any,
    kind: "approve" | "reject",
  ) {
    setError(null);
    setLoading(kind);
    try {
      const response = await getResponse();

      await walletkit.respondSessionRequest({ topic, response });
      ModalStore.close();
    } catch (e) {
      console.error("Failed to respond to request", e);
      setError((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="modal">
      <h2>Request</h2>
      <div className="dapp">
        {metadata?.icons?.[0] && <img src={metadata.icons[0]} alt="" />}
        <div>
          <div style={{ fontWeight: 600 }}>
            {metadata?.name || "Unknown dApp"}
          </div>
          <div className="muted mono">{metadata?.url}</div>
        </div>
      </div>

      <div className="kv">
        <span className="k">Method</span>
        <span className="mono">{request.method}</span>
      </div>
      <div className="kv">
        <span className="k">Chain</span>
        <span>{getChainMeta(chainId)?.name ?? chainId}</span>
      </div>

      <pre className="params">{JSON.stringify(request.params, null, 2)}</pre>

      {error && (
        <div className="banner error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <div className="modal-actions">
        <button
          className="secondary"
          onClick={() => respond(() => rejectRequest(requestEvent), "reject")}
          disabled={loading !== null}
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </button>
        <button
          onClick={() => respond(() => approveRequest(requestEvent), "approve")}
          disabled={loading !== null}
        >
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>
      </div>
    </div>
  );
}
