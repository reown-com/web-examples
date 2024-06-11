import { Address } from 'viem'
import { smartAccountWallets } from './SmartAccountUtil'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'

function getSmartWallet(accountAddress: string, chainId: string) {
  const smartAccount = `${chainId}:${accountAddress}`
  const account = Object.keys(smartAccountWallets).find(sca => {
    return sca === smartAccount
  })
  if (account) {
    const lib = smartAccountWallets[account]
    if (lib) {
      return lib
    }
  }
}

export async function onInstallModule(args: {
  accountAddress: string
  chainId: string
  moduleType: string
  moduleAddress: string
}) {
  const { accountAddress, chainId, moduleType, moduleAddress } = args
  const smartContractWallet = getSmartWallet(accountAddress, chainId)
  console.log(smartContractWallet)
  console.log({ accountAddress, chainId, moduleType, moduleAddress })

  if (smartContractWallet instanceof SafeSmartAccountLib) {
    const txHash = await smartContractWallet.installModule({
      moduleAddress: moduleAddress as Address,
      moduleInitcode: '0x',
      moduleType: BigInt(moduleType)
    })
  }
}
