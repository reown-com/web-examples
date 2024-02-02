<script lang="ts">
	import { account, wagmiConfig } from '$lib/web3modal'
	import toast from 'svelte-french-toast'
	import Button from '../components/Button.svelte'
	import Card from '../components/Card.svelte'
	import { sendTransaction } from '@wagmi/core'

	let label: string = 'Send Transaction'
	let hash: string

	async function handleWrite() {
		if (!$account.address) throw Error('Wallet disconnected')
		label = 'Processing...'

		try {
			const _hash = await sendTransaction(wagmiConfig, {
				to: $account.address,
				value: 0n,
				data: '0x48656c6c6f2066726f6d2057616c6c6574436f6e6e656374',
			})

			//@ts-expect-error Wagmi Type bug
			if (_hash !== 'null') {
				hash = 'Hash: ' + _hash
				toast.success('Message signed successfully')
			} else {
				toast.error('The signature was rejected')
				hash = '_ eth_sendTransaction'
			}
		} catch (error) {
			toast.error((error as Error).message)
			hash = '_ eth_sendTransaction'
		} finally {
			label = 'Send Transaction'
		}
	}
</script>

<Card>
	<div>
		{hash ?? '_ eth_sendTransaction'}
		<Button on:click={handleWrite}>{label}</Button>
	</div>
</Card>

<style>
	div {
		width: 230px;
		word-wrap: break-word;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
	}
</style>
