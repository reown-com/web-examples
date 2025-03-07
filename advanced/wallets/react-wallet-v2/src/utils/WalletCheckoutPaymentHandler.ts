import { encodeFunctionData } from "viem"
import { erc721Abi } from "viem";

import { PaymentOption, DetailedPaymentOption, CheckoutResult, CheckoutErrorMessages, CheckoutErrorCode } from "@/types/wallet_checkout"
import { erc20Abi } from "viem";
import { Wallet } from "ethers";
import { walletkit } from "./WalletConnectUtil";
import { formatJsonRpcError } from "@json-rpc-tools/utils";

const WalletCheckoutPaymentHandler = {
  handleRequest: async (request: any) => {
    
  },

  handleDirectPayment: async (wallet: Wallet, payment: DetailedPaymentOption) => {
    try { 
      const {asset,amount,recipient, assetMetadata} = payment;
      const {assetNamespace} = assetMetadata;
      const assetAddress = asset.split(':')[2];
      const recipientAddress = recipient!.split(':')[2] as `0x${string}`;
      const accountAddress = wallet.address as `0x${string}`;
      // Handle ETH transfers
    if(assetNamespace === 'slip44' && assetAddress === '60'){
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: BigInt(amount),
      })
      return tx.hash
    }
    // Handle ERC20 transfers
    if(assetNamespace === 'erc20'){
      const calldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress, BigInt(amount)]
      })
      const tx = await wallet.sendTransaction({
        to: assetAddress,
        value: '0x0',
        data: calldata
      })
      return tx.hash
    }
    // Handle ERC721 transfers
    if(assetNamespace === 'erc721'){
      const calldata = encodeFunctionData({
        abi: erc721Abi,
        functionName: 'safeTransferFrom',
        args: [accountAddress, recipientAddress, BigInt(amount)]
      })
      const tx = await wallet.sendTransaction({
        to: assetAddress,
        value: '0x0',
        data: calldata
      })
      return tx.hash
    }
    return '0x'
    } catch (error) {
      console.error('Error handling directpayment', error);
      throw new Error(CheckoutErrorMessages[CheckoutErrorCode.DIRECT_PAYMENT_ERROR])
    }
  },
  handleContractPayment: async (wallet: Wallet, payment: DetailedPaymentOption) => {
    try {
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
  catch (error) {
    console.error('Error handling contractpayment', error);
    throw new Error(CheckoutErrorMessages[CheckoutErrorCode.CONTRACT_INTERACTION_FAILED])
  }
  }
}

export default WalletCheckoutPaymentHandler;