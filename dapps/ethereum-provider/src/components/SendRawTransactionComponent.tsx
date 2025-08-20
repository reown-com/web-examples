import React, { useState } from "react";
import { ethers } from "ethers";

interface SendRawTransactionComponentProps {
  provider: any;
  ethersWeb3Provider: ethers.providers.Web3Provider;
}

const SendRawTransactionComponent: React.FC<
  SendRawTransactionComponentProps
> = ({ provider, ethersWeb3Provider }) => {
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestTransaction, setLatestTransaction] = useState<any>(null);

  const getLatestTransaction = async () => {
    try {
      const signer = ethersWeb3Provider.getSigner();
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
    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Get the signer
      const signer = ethersWeb3Provider.getSigner();

      // Create a simple transaction (sending 0 ETH to yourself)
      const address = await signer.getAddress();
      const nonce = await ethersWeb3Provider.getTransactionCount(address);
      const gasPrice = await ethersWeb3Provider.getGasPrice();

      // Create transaction object for RPC call (all values must be hex strings)
      const transaction = {
        to: address, // Send to yourself as example
        value: "0x0", // 0 ETH in hex
        gas: "0x5208", // 21000 gas limit in hex
        gasPrice: gasPrice.toHexString(),
        nonce: `0x${nonce.toString(16)}`, // Convert to hex with 0x prefix
        chainId: "0x1", // Mainnet in hex
      };

      // Sign the transaction using the provider's eth_signTransaction method
      const signedTransaction = await provider.request({
        method: "eth_signTransaction",
        params: [transaction],
      });

      // Send the raw transaction
      const txResponse = await provider.request({
        method: "eth_sendRawTransaction",
        params: [signedTransaction],
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

  return (
    <div>
      <button onClick={getLatestTransaction}>Get Latest Transaction</button>
      <button onClick={sendRawTransaction} disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Raw Transaction"}
      </button>
      {latestTransaction && (
        <div>
          <h4>Latest Transaction:</h4>
          <p>Hash: {latestTransaction.hash}</p>
          <p>From: {latestTransaction.from}</p>
          <p>To: {latestTransaction.to}</p>
          <p>Value: {ethers.utils.formatEther(latestTransaction.value)} ETH</p>
          <p>Nonce: {latestTransaction.nonce}</p>
          <p>
            Gas Price:{" "}
            {ethers.utils.formatUnits(latestTransaction.gasPrice, "gwei")} Gwei
          </p>
        </div>
      )}
      {transactionHash && (
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
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!transactionHash && !error && (
        <p>Click 'Send Raw Transaction' to send a signed transaction</p>
      )}
    </div>
  );
};

export default SendRawTransactionComponent;
