<script lang="ts">
	import { switchChain } from '@wagmi/core'
	import { wagmiConfig, provider, supported_chains } from '$lib/web3modal'
	import toast from 'svelte-french-toast'
	import Card from '../components/Card.svelte'
	import Button from '../components/Button.svelte'

	let selected_chain: string

	async function handleSwitch() {
		try {
			await switchChain(wagmiConfig, {
				chainId: Number(selected_chain),
			})
		} catch (error) {
			toast.error((error as Error).message)
		}
	}
</script>

{#if $provider?.session}
	<Card>
		<div class="main">
			Switch Chain
			<div class="action">
				<select bind:value={selected_chain}>
					<option value="" disabled selected> Select a chain ID </option>
					{#each $supported_chains as chain}
						<option value={chain.slice(7)}>
							{chain.slice(7)}
						</option>
					{/each}
				</select>
				<Button on:click={handleSwitch}>Switch Chain</Button>
			</div>
		</div>
	</Card>
{/if}

<style>
	.main {
		width: 230px;
		word-wrap: break-word;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
	}

	.action {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	select {
		border: none;
		border-radius: 30px;
		padding: 10px;
		cursor: pointer;
		text-align: center;
	}

	option[value=''][disabled] {
		display: none;
	}
</style>
