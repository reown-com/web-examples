import React, { useState } from "react";
import { ethers } from "ethers";

interface SignTransactionComponentProps {
  provider: any;
  ethersWeb3Provider: ethers.BrowserProvider;
}

const SignTransactionComponent: React.FC<SignTransactionComponentProps> = ({
  provider,
  ethersWeb3Provider,
}) => {
  const [signedTransaction, setSignedTransaction] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  const signTransaction = async () => {
    setIsLoading(true);
    setError(null);
    setSignedTransaction(null);
    setTransactionDetails(null);

    try {
      // Get the signer
      const signer = await ethersWeb3Provider.getSigner();
      const address = await signer.getAddress();
      const nonce = await ethersWeb3Provider.getTransactionCount(address);
      const gasPrice = await ethersWeb3Provider.getFeeData();

      // Create transaction object for RPC call (all values must be hex strings)
      // Following the Reown documentation format for eth_signTransaction
      const transaction = {
        from: address, // The address the transaction is sent from
        to: address, // Send to yourself as example (optional when creating new contract)
        data: "0x", // Empty data (optional) - The compiled code of a contract OR the hash of the invoked method signature and encoded parameters
        gas: "0x5208", // 21000 gas limit in hex (optional, default: 90000)
        gasPrice: gasPrice.gasPrice ? ethers.toBeHex(gasPrice.gasPrice) : "0x0", // (optional, default: To-Be-Determined)
        value: "0x0", // 0 ETH in hex (optional) - Integer of the value sent with this transaction
        nonce: `0x${nonce.toString(16)}`, // (optional) - Integer of a nonce. This allows to overwrite your own pending transactions that use the same nonce.
        chainId: "0x1", // Mainnet in hex
      };

      setTransactionDetails(transaction);

      // Sign the transaction using the provider's eth_signTransaction method
      // According to Reown docs: eth_signTransaction signs a transaction that can be submitted to the network at a later time using eth_sendRawTransaction
      const signedTx = await provider.request({
        method: "eth_signTransaction",
        params: [transaction],
      });

      setSignedTransaction(signedTx as string);
      console.log("Transaction signed:", signedTx);
      console.log("Original transaction:", transaction);
    } catch (error) {
      console.error("Error signing transaction:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setSignedTransaction(null);
    setTransactionDetails(null);
    setError(null);
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
      <h3>Sign Transaction (eth_signTransaction)</h3>
      <p>
        This demonstrates the <code>eth_signTransaction</code> method that signs
        a transaction which can be submitted later using{" "}
        <code>eth_sendRawTransaction</code>.
      </p>

      <button onClick={signTransaction} disabled={isLoading}>
        {isLoading ? "Signing..." : "Sign Transaction"}
      </button>

      <button onClick={clearResults} style={{ marginLeft: "10px" }}>
        Clear Results
      </button>

      {transactionDetails && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "5px",
          }}
        >
          <h4>Transaction Details:</h4>
          <p>
            <strong>From:</strong> {transactionDetails.from}
          </p>
          <p>
            <strong>To:</strong> {transactionDetails.to}
          </p>
          <p>
            <strong>Value:</strong>{" "}
            {ethers.formatEther(transactionDetails.value)} ETH
          </p>
          <p>
            <strong>Gas:</strong> {parseInt(transactionDetails.gas, 16)}
          </p>
          <p>
            <strong>Gas Price:</strong>{" "}
            {ethers.formatUnits(transactionDetails.gasPrice, "gwei")} Gwei
          </p>
          <p>
            <strong>Nonce:</strong> {parseInt(transactionDetails.nonce, 16)}
          </p>
          <p>
            <strong>Chain ID:</strong>{" "}
            {parseInt(transactionDetails.chainId, 16)}
          </p>
          <p>
            <strong>Data:</strong> {transactionDetails.data || "0x (empty)"}
          </p>
        </div>
      )}

      {signedTransaction && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#e8f5e8",
            borderRadius: "5px",
          }}
        >
          <h4>Signed Transaction:</h4>
          <p
            style={{
              wordBreak: "break-all",
              fontFamily: "monospace",
              fontSize: "12px",
            }}
          >
            {signedTransaction}
          </p>
          <p style={{ marginTop: "10px", fontSize: "14px" }}>
            <strong>Note:</strong> This signed transaction can now be submitted
            to the network using <code>eth_sendRawTransaction</code>.
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

      {!signedTransaction && !error && !isLoading && (
        <p style={{ marginTop: "20px", color: "#666" }}>
          Click 'Sign Transaction' to sign a transaction using
          eth_signTransaction
        </p>
      )}
    </div>
  );
};

export default SignTransactionComponent;
