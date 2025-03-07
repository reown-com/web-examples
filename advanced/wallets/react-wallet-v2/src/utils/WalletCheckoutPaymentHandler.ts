import { encodeFunctionData } from "viem"
import { erc721Abi } from "viem";

import { PaymentOption, DetailedPaymentOption } from "@/types/wallet_checkout"
import { erc20Abi } from "viem";
import { Wallet } from "ethers";

const WalletCheckoutPaymentHandler = {
  handleRequest: async (request: any) => {
    
  },

  handleDirectPayment: async (wallet: Wallet, payment: DetailedPaymentOption) => {
    const {asset,amount,recipient, assetMetadata} = payment;
    const {assetNamespace} = assetMetadata;
    const assetAddress = asset.split(':')[2] as `0x${string}`;
    if(assetNamespace === 'erc20'){
      const calldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient!.split(':')[2] as `0x${string}`, BigInt(amount)]
      })
      const tx = await wallet.sendTransaction({
        to: assetAddress,
        value: '0x0',
        data: calldata
      })
      return tx.hash
    }
    if(assetNamespace === 'erc721'){
      const calldata = encodeFunctionData({
        abi: erc721Abi,
        functionName: 'safeTransferFrom',
        args: [payment.recipient!.split(':')[2] as `0x${string}`, payment.recipient!.split(':')[2] as `0x${string}`, BigInt(payment.amount)]
      })
      const tx = await wallet.sendTransaction({
        to: assetAddress,
        value: '0x0',
        data: calldata
      })
      return tx.hash
    }
    return '0x'
  },
  handleContractPayment: async (wallet: Wallet, payment: DetailedPaymentOption) => {
    const { contractInteraction } = payment;
    
    if (contractInteraction && Array.isArray(contractInteraction.data)) {
      let lastTxHash = '0x';
      
      // Use for...of loop instead of forEach to properly wait for each async operation
      for (const call of contractInteraction.data) {
        console.log('call', call);
        const tx = await wallet.sendTransaction({
          to: call.to,
          value: call.value,
          data: call.data
        });
        console.log('tx', tx);
        lastTxHash = tx.hash;
      }
      
      return lastTxHash;
    }
    
    console.log('contractInteraction single call', contractInteraction);
    if (contractInteraction && typeof contractInteraction.data === 'object' && !Array.isArray(contractInteraction.data)) {
      const tx = await wallet.sendTransaction({
          to: contractInteraction.data['to'],
          value: contractInteraction.data['value'],
          data: contractInteraction.data['data']
      });
      return tx.hash;
    }
   
    return '0x';
  }
}

export default WalletCheckoutPaymentHandler;