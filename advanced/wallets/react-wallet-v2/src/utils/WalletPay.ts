import { EngineTypes } from '@walletconnect/types'
import { parseChainId } from '@walletconnect/utils'
import { getAddress } from './AuthUtil'
import { getWallet } from './EIP155WalletUtil'
import EIP155Lib from '@/lib/EIP155Lib'

export async function processWalletPay({ walletPay }: { walletPay: EngineTypes.WalletPayParams }) {
  const chainId = parseChainId(walletPay.acceptedPayments[0].recipient)
  const address = getAddress(`${chainId.namespace}:${chainId.reference}`)
  const wallet = (await getWallet(address)) as EIP155Lib
  return wallet.walletPay(walletPay)
}
