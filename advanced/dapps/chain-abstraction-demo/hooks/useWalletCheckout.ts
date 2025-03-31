import * as React from 'react'
import { useCallback, useEffect } from 'react'

import UniversalProvider from '@walletconnect/universal-provider'

import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

import type { EvmContractInteraction, PaymentOption } from '@/types/wallet_checkout'
import { createTokenTransferSolanaInstruction } from '@/utils/WalletCheckoutUtil'
import { parseEther, toHex } from 'viem'
import { encodeFunctionData, erc20Abi } from 'viem'

export function useWalletCheckout() {
  const { address, status } = useAppKitAccount({ namespace: 'eip155' })
  const { address: solanaAddress, status: solanaStatus } = useAppKitAccount({ namespace: 'solana' })
  const { walletProvider, walletProviderType } = useAppKitProvider<UniversalProvider>('eip155')
  const [isWalletCheckoutSupported, setIsWalletCheckoutSupported] = React.useState(false)
  const vitalikEthAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

  const getSolanaPaymentsOptions = useCallback(async () => {
    if (solanaAddress && solanaStatus === 'connected') {
      const paymentOptions: PaymentOption[] = [
        {
          asset:
            'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          amount: '0xF4240',
          // Karandeep's devnet wallet
          recipient:
            'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1:2eudG2xaKDpyBJVMUMSAvSvhTWDnHJn9cCAoJeP9BZzz'
        },
        {
          asset: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/slip44:501',
          amount: '0xF4240',
          // Karandeep's devnet wallet
          recipient:
            'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1:2eudG2xaKDpyBJVMUMSAvSvhTWDnHJn9cCAoJeP9BZzz'
        }
        // ,{
        //   asset:
        //     'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        //   amount: '0xF4240',
        //   // Karandeep's devnet wallet
        //   contractInteraction: await createTokenTransferSolanaInstruction({
        //     sourceAddress: solanaAddress,
        //     destinationAddress: '2eudG2xaKDpyBJVMUMSAvSvhTWDnHJn9cCAoJeP9BZzz',
        //     tokenMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        //     amount: 2
        //   })
        // }
      ]

      return paymentOptions
    }

    return []
  }, [solanaAddress, solanaStatus])

  const getEvmPaymentsOptions = useCallback(async () => {
    if (address && status === 'connected') {
      return [
        {
          recipient: `eip155:84532:${vitalikEthAddress}`,
          asset: 'eip155:84532/erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: '0xF4240' as `0x${string}`
        },
        {
          recipient: `eip155:84532:${vitalikEthAddress}`,
          asset: 'eip155:84532/slip44:60',
          amount: toHex(parseEther('0.0005'))
        },
        {
          asset: 'eip155:11155420/erc20:0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
          amount: '0xF4240' as `0x${string}`,
          contractInteraction: {
            type: 'evm-calls',
            data: [
              {
                to: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: 'transfer',
                  args: [vitalikEthAddress as `0x${string}`, BigInt(1000000)]
                }),
                value: '0x0'
              }
            ]
          } as EvmContractInteraction
        }
      ]
    }

    return []
  }, [address, status])

  const isMethodSupported = useCallback(
    async ({
      provider,
      method,
      walletProviderType
    }: {
      provider: UniversalProvider
      method: string
      walletProviderType: string
    }): Promise<{ isSupported: boolean }> => {
      if (walletProviderType === 'WALLET_CONNECT') {
        const isSupported = Boolean(provider.namespaces?.['eip155']?.methods?.includes(method))

        return Promise.resolve({ isSupported })
      }

      return { isSupported: false }
    },
    []
  )

  const getPreConfiguredPaymentsOptions = useCallback(async () => {
    return [...(await getEvmPaymentsOptions()), ...(await getSolanaPaymentsOptions())]
  }, [getEvmPaymentsOptions, getSolanaPaymentsOptions])

  useEffect(() => {
    if (address && status === 'connected' && walletProvider && walletProviderType) {
      isMethodSupported({
        provider: walletProvider,
        method: 'wallet_checkout',
        walletProviderType
      }).then(({ isSupported }) => {
        setIsWalletCheckoutSupported(isSupported)
      })
    }
  }, [address, status, walletProvider, walletProviderType, isMethodSupported])


  return {
    isWalletCheckoutSupported,
    getPreConfiguredPaymentsOptions
  }
}
