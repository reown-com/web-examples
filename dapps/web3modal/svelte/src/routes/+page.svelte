<script lang="ts">
	import { account } from '$lib/web3modal'
	import { Toaster } from 'svelte-french-toast'
	import Network from '../partials/Network.svelte'
	import SignMessage from '../partials/SignMessage.svelte'
	import SignTypeData from '../partials/SignTypeData.svelte'
	import Transaction from '../partials/Transaction.svelte'
	import Wallet from '../partials/Wallet.svelte'
</script>

<div class="main">
	<Network />
	<Wallet />
	{#if $account.isConnected}
		<SignMessage />
		<SignTypeData />
		<Transaction />
	{/if}
</div>

<Toaster />

<style>
	.main {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 30px;
		width: 100%;
		padding: 20px;
	}
</style>
