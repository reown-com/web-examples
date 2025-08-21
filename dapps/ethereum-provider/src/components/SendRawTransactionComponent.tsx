import React, { useState } from "react";
import { ethers } from "ethers";

interface SendRawTransactionComponentProps {
  provider: any;
  ethersWeb3Provider: ethers.BrowserProvider;
}

const SendRawTransactionComponent: React.FC<
  SendRawTransactionComponentProps
> = ({ provider, ethersWeb3Provider }) => {
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestTransaction, setLatestTransaction] = useState<any>(null);
  const [signedTransactionInput, setSignedTransactionInput] =
    useState<string>("");

  const getLatestTransaction = async () => {
    try {
      const signer = await ethersWeb3Provider.getSigner();
      const address = await signer.getAddress();

      // Get the latest block number
      const latestBlock = await ethersWeb3Provider.getBlockNumber();

      // Get the latest transaction for this address
      const filter = {
        fromBlock: latestBlock - 1000, // Look back 1000 blocks
        toBlock: latestBlock,
        address: address,
      };

      const logs = await ethersWeb3Provider.getLogs(filter);

      if (logs.length > 0) {
        // Get the latest transaction
        const latestLog = logs[logs.length - 1];
        const tx = await ethersWeb3Provider.getTransaction(
          latestLog.transactionHash
        );
        setLatestTransaction(tx);
        console.log("Latest transaction:", tx);
      } else {
        console.log("No recent transactions found for this address");
      }
    } catch (error) {
      console.error("Error fetching latest transaction:", error);
    }
  };

  const sendRawTransaction = async () => {
    if (!signedTransactionInput.trim()) {
      setError("Please enter a signed transaction");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Send the raw transaction using eth_sendRawTransaction
      const txResponse = await provider.request({
        method: "eth_sendRawTransaction",
        params: [signedTransactionInput],
      });

      setTransactionHash(txResponse as string);
      console.log("Transaction sent:", txResponse);
    } catch (error) {
      console.error("Error sending raw transaction:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTransactionHash(null);
    setError(null);
    setSignedTransactionInput("");
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "20px",
        margin: "10px",
        borderRadius: "8px",
      }}
    >
      <h3>Send Raw Transaction (eth_sendRawTransaction)</h3>
      <p>
        This demonstrates the <code>eth_sendRawTransaction</code> method that
        submits a signed transaction to the network. First sign a transaction
        using the Sign Transaction component above, then paste the signed
        transaction here.
      </p>

      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="signedTxInput"
          style={{ display: "block", marginBottom: "5px" }}
        >
          <strong>Signed Transaction (hex):</strong>
        </label>
        <textarea
          id="signedTxInput"
          value={signedTransactionInput}
          onChange={(e) => setSignedTransactionInput(e.target.value)}
          placeholder="Paste the signed transaction hex string here..."
          style={{
            width: "100%",
            height: "80px",
            fontFamily: "monospace",
            fontSize: "12px",
            padding: "8px",
          }}
        />
      </div>

      <button
        onClick={sendRawTransaction}
        disabled={isLoading || !signedTransactionInput.trim()}
      >
        {isLoading ? "Sending..." : "Send Raw Transaction"}
      </button>

      <button onClick={clearResults} style={{ marginLeft: "10px" }}>
        Clear Results
      </button>

      <button onClick={getLatestTransaction} style={{ marginLeft: "10px" }}>
        Get Latest Transaction
      </button>

      {latestTransaction && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "5px",
          }}
        >
          <h4>Latest Transaction:</h4>
          <p>Hash: {latestTransaction.hash}</p>
          <p>From: {latestTransaction.from}</p>
          <p>To: {latestTransaction.to}</p>
          <p>Value: {ethers.formatEther(latestTransaction.value)} ETH</p>
          <p>Nonce: {latestTransaction.nonce}</p>
          <p>
            Gas Price: {ethers.formatUnits(latestTransaction.gasPrice, "gwei")}{" "}
            Gwei
          </p>
        </div>
      )}

      {transactionHash && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#e8f5e8",
            borderRadius: "5px",
          }}
        >
          <h4>Transaction Sent Successfully!</h4>
          <p>
            Transaction Hash:{" "}
            <a
              href={`https://etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {transactionHash}
            </a>
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#ffe6e6",
            borderRadius: "5px",
          }}
        >
          <h4 style={{ color: "red" }}>Error:</h4>
          <p style={{ color: "red" }}>{error}</p>
        </div>
      )}

      {!transactionHash && !error && !isLoading && (
        <p style={{ marginTop: "20px", color: "#666" }}>
          First sign a transaction using the Sign Transaction component above,
          then paste the signed transaction hex string and click 'Send Raw
          Transaction'.
        </p>
      )}
    </div>
  );
};

export default SendRawTransactionComponent;
