import { createWeb3Modal } from "@web3modal/wagmi"
import { cookieStorage, createConfig, createStorage, http } from "wagmi"
import { getConnectors, watchConnectors } from "wagmi/actions"
import { Chain, mainnet, sepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''

if (!projectId) throw new Error('WalletConnect Project ID is undefined')

// 2. Create wagmiConfig
const metadata = {
	name: 'Web3Modal',
	description: 'Web3Modal Example',
	url: 'https://web3modal.com',
	icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const chains = [mainnet, sepolia] as [Chain, ...Chain[]]

export const wagmiConfig = createConfig({
	chains,
	transports: {
		[mainnet.id]: http(),
		[sepolia.id]: http(),
	},
	connectors: [walletConnect({ projectId, metadata, showQrModal: false }), injected()],
	ssr: true,
	storage: createStorage({
		storage: cookieStorage,
	}),
})

const connectors = getConnectors(wagmiConfig)
console.log(connectors)

watchConnectors(wagmiConfig, { onChange(cone){ console.log(cone) } })
// 3. Create modal
createWeb3Modal({ wagmiConfig, projectId, chains })

