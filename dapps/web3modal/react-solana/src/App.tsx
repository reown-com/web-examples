import { createWeb3Modal, defaultSolanaConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@web3modal/solana/chains'
import { useEffect, useState, useRef } from "react";
import {
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  Connection,
  TransactionInstruction
} from '@solana/web3.js'

import base58 from 'bs58';

const Program_Id = "9sutTcUUjWVMabvUnBFu5WcBLNkuHHv9tLWhUUeCM6Cy";

const events: string[] = [];

// 0. Setup chains
const chains = [solana, solanaTestnet, solanaDevnet]

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");


// 2. Create solanaConfig
const metadata = {
    name: 'Appkit Solana Example',
    description: 'Appkit Solana Example',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const solanaConfig = defaultSolanaConfig({
  metadata,
  chains,
  projectId,
  auth: {
    email: true,
    socials: ['google', 'x', 'farcaster', 'github']
  }
})

// 3. Create modal
createWeb3Modal({
    metadata,
    solanaConfig,
    chains,
    projectId,
  })
  
const App = () => {

    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState("");
    const txtConsoleRef = useRef(null);

    const { address, chainId } = useWeb3ModalAccount()
    const { walletProvider, connection } = useWeb3ModalProvider() 

    useEffect(() => {
        if (walletProvider) {
          handleGetBalance();
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
    },[walletProvider]);

    const handleFaucet = async () => {
      // redirect to
      window.open('https://solfaucet.com/', '_blank');
    }

    const printConsole = (msg: string) => {
      const txtConsole = txtConsoleRef.current as HTMLTextAreaElement | null;
      txtConsole!.value = msg;
      console.log(msg);
    }

    const handleGetBalance = async () => {
      if (!walletProvider || !address || !connection) {
        printConsole('walletProvider or address is undefined');
        return;
      }
      const balance = await connection.getBalance( walletProvider.publicKey);
      //convert balance to SOL
      const sol = balance / 1000000000;
      setBalance(sol.toString() + " SOL");
      console.log('Balance: ', sol.toString() + " SOL");
    }

    const handleSign = async () => {
      if (!walletProvider || !address) {
          printConsole('walletProvider or address is undefined');
          return;
      }

      const encodedMessage = new TextEncoder().encode('Appkit Solana')
      const signature = await walletProvider.signMessage(encodedMessage)
      const base58SignatureValue = base58.encode(signature)

      printConsole(`Signature: ${base58SignatureValue}`);
    }

    const handleSendTransaction = async () => {
      if (!connection) {
        printConsole('connection not set');
        return;
      }
      if (!walletProvider || !address || !connection) {
        printConsole('walletProvider or address is undefined');
        return;
      }

      const recipientAddress = new PublicKey("DG1Bq6muEMqaW6MHzWZFfQ8MmHiwvEuQcjVefVmPoV3j")

      // Create a new transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletProvider.publicKey,
          toPubkey: recipientAddress,
          lamports: 10000000,  //0.01 SOL
        })
      )
      transaction.feePayer = walletProvider.publicKey;

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      const tx = await walletProvider.sendTransaction(transaction, connection as Connection)
      // Update Balance after 8s
      setTimeout(handleGetBalance, 8000);

      printConsole(tx);      
    }

    const handleSendTransactionv0 = async () => {
      if (!connection) {
        printConsole('connection not set');
        return;
      }
      if (!walletProvider || !address || !connection) {
        printConsole('walletProvider or address is undefined');
        return;
      }

      const recipientAddress = new PublicKey("DG1Bq6muEMqaW6MHzWZFfQ8MmHiwvEuQcjVefVmPoV3j")

      // Create a new transaction
      const instructions = [
        SystemProgram.transfer({
          fromPubkey: walletProvider.publicKey,
          toPubkey: recipientAddress,
          lamports: 10000000 //0.01 SOL
        })
      ]
      const { blockhash } = await connection.getLatestBlockhash();

      // Create v0 compatible message
      const messageV0 = new TransactionMessage({
        payerKey: walletProvider.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message()

      // Make a versioned transaction
      const transactionV0 = new VersionedTransaction(messageV0)

      const signature = await walletProvider.sendTransaction(
        transactionV0,
        connection as Connection
      )

      // Update Balance after 8s
      setTimeout(handleGetBalance, 8000);

      printConsole(signature);
    }
    
    const handleReadSC = async () => {
      if (!connection) {
        printConsole('connection not set');
        return;
      }
      if (!walletProvider || !address) {
        printConsole('walletProvider or address is undefined');
        return;
      }
    }


return (
    <div className="App center-content">
      <h2>WalletConnect AppKit + Solana</h2>
      <p>
        <w3m-button balance="hide" />
      </p>
      {isConnected && (
        <>
          <p>
            Balance: {balance}
          </p>
          <div className="btn-container">
          <button onClick={handleFaucet}>Solana faucet</button>
          <button onClick={handleGetBalance}>Update Balance</button>
            <button onClick={handleSign}>Sign MSG</button>
            <button onClick={handleSendTransaction}>Send tx</button>
            <button onClick={handleSendTransactionv0}>Send tx v0</button>
          </div>
          <br />
          <div>
            <textarea className="console" ref={txtConsoleRef} readOnly>
                
            </textarea>
          </div>
        </>
      )
    }
      
      <div className="circle">
        <a href="https://github.com/WalletConnect/web-examples/tree/main/dapps/web3modal" target="_blank"><img src="/github.png" alt="GitHub" width="50" /></a>
      </div>
    </div>
  );
}

export default App;