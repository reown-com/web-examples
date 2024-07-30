import { createWeb3Modal, defaultSolanaConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@web3modal/solana/chains'
import { useEffect, useState, useRef } from "react";
import {
    PhantomWalletAdapter,
    HuobiWalletAdapter,
    SolflareWalletAdapter,
    TrustWalletAdapter
  } from '@solana/wallet-adapter-wallets'

import {
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js'

const events: string[] = [];

// 0. Setup chains
const chains = [solana, solanaTestnet, solanaDevnet]

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");


// 2. Create solanaConfig
const metadata = {
    name: 'Appkit Solana Example v1',
    description: 'Appkit Solana Example v1',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const solanaConfig = defaultSolanaConfig({
        metadata,
        chains,
        projectId,
    })

// 3. Create modal
createWeb3Modal({
    metadata,
    solanaConfig,
    chains,
    projectId,
    wallets: [  
      new PhantomWalletAdapter(),
      new HuobiWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter()
    ],
  })
  
const App = () => {

    const [isConnected, setIsConnected] = useState(false);
    const txtConsoleRef = useRef(null);

    const { address, chainId } = useWeb3ModalAccount()
    const { walletProvider, connection } = useWeb3ModalProvider() 

    useEffect(() => {
        if (walletProvider) {
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

    const handleSign = async () => {
      if (!walletProvider || !address) {
          printConsole('walletProvider or address is undefined');
          return;
      }

      const encodedMessage = new TextEncoder().encode('Appkit Solana')
      const signature = await walletProvider.signMessage(encodedMessage) as Uint8Array
      const joinSignatureValue = signature.join('');

      printConsole(`Signature: ${joinSignatureValue}`);
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
      
      const signedTransaction =  await walletProvider.signTransaction(transaction);
      transaction.addSignature(walletProvider.publicKey, Buffer.from(signedTransaction.signatures[0].signature));
      console.log("Verify sign: ", transaction.verifySignatures()); // <---- here is the issue
      console.log('transaction',  signedTransaction);
      const res = await connection.sendRawTransaction(transaction.serialize());
      printConsole('res: '+ res);
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

      const signature = await walletProvider.signTransaction(
        transactionV0
      )
      transactionV0.addSignature(walletProvider.publicKey, Buffer.from(signature.signatures[0].signature));
      printConsole(`Signature: ${signature}`);

      const res = await connection.sendRawTransaction(transactionV0.serialize());
      printConsole('send : '+ res);
      /*
      const confirmationResult = await connection.confirmTransaction(
        txSignature,
        "confirmed",
      );
  
      if (confirmationResult.value.err) {
        throw new Error(JSON.stringify(confirmationResult.value.err));
      } else {
        console.log("Transaction successfully submitted!");
      }
      */
    }
    

return (
    <div className="App center-content">
      <h2>WalletConnect AppKit + Solana v1</h2>
      <w3m-button  />
      {isConnected && (
        <>
          <div className="btn-container">
          <button onClick={handleFaucet}>Solana faucet</button>
            <button onClick={handleSign}>Sign MSG</button>
            <button onClick={handleSendTransaction}>Send Transaction</button>
            <button onClick={handleSendTransactionv0}>Send Transaction v0</button>
          </div>
          <br />
          <div>
            <textarea className="console" ref={txtConsoleRef} readOnly  wrap='hard'>
                
            </textarea>
          </div>
        </>
      )
    }
      
      <div className="circle">
        <a href="https://github.com/WalletConnect/web-examples/" target="_blank"><img src="/github.png" alt="GitHub" width="50" /></a>
      </div>
    </div>
  );
}

export default App;