import { useAppKitAccount, useAppKit } from '@reown/appkit/react'
import { useDisconnect } from 'wagmi'
import { useWriteContract } from 'wagmi';
import { useSignMessage } from 'wagmi'


export function WagmiHooks() {
  const {  address, caipAddress, isConnected, status  } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect();
  const { open, close } = useAppKit();

  // Split the caipAddress to get the chain id
  const data2 = caipAddress?.split(':');

  const {  data: hash, writeContractAsync } = useWriteContract();

  const onSign = async () => {
    const ret = await signMessageAsync({ message: 'Hello AppKit!' })
    console.log(ret);
  }

  const onApprove = async () => {
      const tokenAddress = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
      const spenderAddress = "0xcB6A062a349F60832F21Db6A5bE71603107884C7"; 
      
       await writeContractAsync(
        {
          address: tokenAddress,
          abi: [{
            type: 'function',
            name: 'approve',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ type: 'bool' }],
          }],
          functionName: 'approve',
          args: [spenderAddress, 123n], // Approving 123 tokens
      });

  };
  return (
    <div>
      {isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>Chain ID: {data2![1]}</p>
          <p>Status: {status}</p>
          <p><button onClick={() => open()}>open hook</button> - <button onClick={() => close()}>close hook</button></p>
          <p><button onClick={() => disconnect()}>Disconnect Hook</button></p>
          <button onClick={() => onApprove()}>Approve</button>
          <button onClick={() => onSign()}>Sign</button>
          <div v-if="hash">Transaction Hash: { hash }</div>
        </div>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  )
}