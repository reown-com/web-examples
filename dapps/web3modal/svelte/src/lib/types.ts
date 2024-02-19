import type { InjectedConnector } from '@wagmi/core'

export type Metadata = {
	name?: string
	description?: string
	icons?: string[]
	url?: string
}

export type ExtendedProvider = {
	session?: {
		peer: {
			metadata: Metadata
		}
		namespaces: {
			eip155: {
				chains: string[]
				methods: string[]
				events: string[]
			}
		}
	}
} & InjectedConnector
