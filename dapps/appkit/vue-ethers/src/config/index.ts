import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, polygon, base, type AppKitNetwork} from '@reown/appkit/networks'


export const projectId = import.meta.env.VITE_PROJECT_ID || ""
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon, base]

export const ethersAdapter = new EthersAdapter()