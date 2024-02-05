<script lang="ts">
	import type { Metadata } from '$lib/types'
	import Card from '../components/Card.svelte'
	import { account, provider, supported_chains } from '../lib/web3modal'

	let metadata: Metadata
	let chains: string[] = []
	let methods: string[] = []
	let events: string[] = []

	provider.subscribe((value) => {
		const session = value?.session
		if (session) {
			const namespaces = session.namespaces?.eip155
			metadata = session.peer?.metadata
			chains = namespaces?.chains
			methods = namespaces?.methods
			events = namespaces?.events

			if (chains.length) supported_chains.set(chains)
		}
	})
</script>

{#if $account.isConnected && metadata}
	<Card>
		<span>
			{#if metadata.name}
				<span id="title">Wallet:</span> {metadata.name}
			{/if}
		</span>
		{#if metadata.description}
			<span>
				<span id="title">description:</span>
				{metadata.description}
			</span>
		{/if}
		{#if metadata.icons?.[0]}
			<span>
				<span id="title">icon:</span>
				<img class="wallet-icon" src={metadata.icons[0]} alt="wallet icon" />
			</span>
		{/if}
		{#if metadata.url}
			<span>
				<span id="title">Domain:</span>
				<a href={metadata.url} target="_blank" rel="noreferrer nofollow"
					>{metadata.url}</a
				>
			</span>
		{/if}
	</Card>
	{#if chains}
		<Card overflow>
			<span id="title">Approved Chains:</span>
			{#each chains as chain}
				<div>{chain}</div>
			{/each}
		</Card>
	{/if}
	{#if events}
		<Card overflow>
			<span id="title">Approved Events:</span>
			{#each events as event}
				<div>{event}</div>
			{/each}
		</Card>
	{/if}
	{#if methods}
		<Card overflow>
			<span id="title">Approved Methods:</span>
			{#each methods as method}
				<div>{method}</div>
			{/each}
		</Card>
	{/if}
{/if}

<style>
	#title {
		font-weight: 500;
	}

	.wallet-icon {
		width: 40px;
		height: auto;
	}
</style>
