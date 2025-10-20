import { AuthTypes } from '@walletconnect/types'
import { walletkit } from './WalletConnectUtil'
import { eip155Addresses, eip155Wallets } from './EIP155WalletUtil'
import { tonAddresses, tonWallets } from './TonWalletUtil'
import { solanaAddresses, solanaWallets } from './SolanaWalletUtil'
import { cosmosAddresses, cosmosWallets } from './CosmosWalletUtil'
import { kadenaAddresses, kadenaWallets } from './KadenaWalletUtil'
import { multiversxAddresses, multiversxWallets } from './MultiversxWalletUtil'
import { nearAddresses, nearWallet } from './NearWalletUtil'
import { polkadotAddresses, polkadotWallets } from './PolkadotWalletUtil'
import { tezosAddresses, tezosWallets } from './TezosWalletUtil'
import { tronAddresses, tronWallets } from './TronWalletUtil'
import { bip122Addresses, bip122Wallet } from './Bip122WalletUtil'
import { getWallet as getSuiWallet, suiAddresses } from './SuiWalletUtil'
import { stacksAddresses, stacksWallet } from './StacksWalletUtil'
import {
  buildAuthObject,
  getDidAddress,
  getDidAddressNamespace,
  getDidChainId,
  parseChainId
} from '@walletconnect/utils'
import { IBip122ChainId } from '@/data/Bip122Data'
import { AuthenticationMessage } from '@/types/auth'
import bs58 from 'bs58'
const didPrefix = 'did:pkh:'

type AuthMessage = {
  message: string
  chainId: string
  address: string
}

export function prepareAuthenticationMessages(
  authenticationRequests: AuthTypes.AuthenticateParams[]
) {
  const authenticationMessagesToSign = []
  for (const request of authenticationRequests) {
    for (const chain of request.chains) {
      try {
        const iss = getIss(chain)
        const message = walletkit.formatAuthMessage({
          request,
          iss
        })
        authenticationMessagesToSign.push({ ...request, message, iss })
      } catch (e) {
        console.error(e)
      }
    }
  }
  return authenticationMessagesToSign
}

function getIss(chain: string) {
  return `${didPrefix}${chain}:${getAddress(chain)}`
}

function getAddress(chain: string) {
  const parsedChain = parseChainId(chain)
  switch (parsedChain.namespace) {
    case 'eip155':
      return eip155Addresses[0]
    case 'ton':
      return tonAddresses[0]
    case 'solana':
      return solanaAddresses[0]
    case 'cosmos':
      return cosmosAddresses[0]
    case 'kadena':
      return kadenaAddresses[0]
    case 'mvx':
      return multiversxAddresses[0]
    case 'near':
      return nearAddresses[0]
    case 'polkadot':
      return polkadotAddresses[0]
    case 'tezos':
      return tezosAddresses[0]
    case 'tron':
      return tronAddresses[0]
    case 'bip122':
      return bip122Wallet.getAddress(chain as IBip122ChainId)
    case 'sui':
      return suiAddresses[0]
    case 'stacks':
      return stacksWallet.getAddress(chain)
    default:
      throw new Error(`no address found for chain ${chain}`)
  }
}

export async function signAuthenticationMessages(
  authenticationMessagesToSign?: AuthenticationMessage[]
) {
  if (!authenticationMessagesToSign) return []
  const signedAuths = []
  for (const toSign of authenticationMessagesToSign) {
    const result = await signMessage({
      chainId: `${getDidAddressNamespace(toSign.iss)!}:${getDidChainId(toSign.iss)!}`,
      address: getDidAddress(toSign.iss)!,
      message: toSign.message
    })
    if (result?.signature) {
      const auth = buildAuthObject(
        toSign,
        {
          t: result.type as any,
          s: result.signature,
          m: result?.publicKey
        },
        toSign.iss
      )
      signedAuths.push(auth)
    }
  }
  return signedAuths
}

export async function signMessage(AuthMessage: AuthMessage) {
  const parsed = parseChainId(AuthMessage.chainId)

  switch (parsed.namespace) {
    case 'eip155':
      const eip155Result = await eip155Wallets[AuthMessage.address].signMessage(AuthMessage.message)
      return { signature: eip155Result, type: 'eip191' }
    case 'ton':
      const tonResult = await tonWallets[AuthMessage.address].signData({
        text: AuthMessage.message,
        type: 'text'
      })
      return { signature: tonResult.signature, publicKey: tonResult.publicKey, type: 'ton' }
    case 'solana':
      const solanaResult = await solanaWallets[AuthMessage.address].signMessage({
        message: bs58.encode(new Uint8Array(Buffer.from(AuthMessage.message)))
      })
      return { signature: solanaResult.signature, type: 'solana' }
    case 'cosmos':
      // TODO: Cosmos requires extra params
      // return cosmosWallets[0].signAmino(AuthMessage.message)
      break
    case 'kadena':
      // TODO: Kadena requires extra params
      // return kadenaWallets[0].sign(AuthMessage.message)
      break
    case 'mvx':
      const multiversxResult = await multiversxWallets[AuthMessage.address].signMessage(
        AuthMessage.message
      )
      return { signature: multiversxResult.signature, type: 'multiversx' }
    case 'near':
      // TODO: Near requires extra params
      // return nearWallet.signMessage({
      //   messageParams: {
      //     message: AuthMessage.message,
      //     nonce: Buffer.from(AuthMessage.address),
      //   }
      // })
      break
    case 'polkadot':
      const polkadotResult = await polkadotWallets[AuthMessage.address].signMessage(
        AuthMessage.message
      )
      return { signature: polkadotResult.signature, type: 'polkadot' }
    case 'tezos':
      const tezosResult = await tezosWallets[AuthMessage.address].signPayload(AuthMessage.message)
      return { signature: tezosResult.sig, type: 'tezos' }
    case 'tron':
      const tronResult = await tronWallets[AuthMessage.address].signMessage(AuthMessage.message)
      return { signature: tronResult, type: 'tron' }
    case 'bip122':
      const bip122Result = await bip122Wallet.signMessage({
        message: AuthMessage.message,
        address: AuthMessage.address,
        chainId: AuthMessage.chainId as IBip122ChainId,
        protocol: 'ecdsa'
      })
      return { signature: bip122Result.signature, type: 'bip122' }
    case 'sui':
      const suiResult = await (await getSuiWallet()).signMessage({ message: AuthMessage.message })
      return { signature: suiResult.signature, type: 'sui' }
    case 'stacks':
      const stacksResult = await stacksWallet.signMessage({
        message: AuthMessage.message,
        address: AuthMessage.address,
        chainId: AuthMessage.chainId
      })
      return { signature: stacksResult.signature, type: 'stacks' }
    default:
      throw new Error(`Failed to sign message for chain ${AuthMessage.chainId}`)
  }
}
