<script lang="ts">
	import { chainId, account } from '$lib/web3modal'
	import Card from '../components/Card.svelte'
</script>

{#if $account.address}
	<Card>
		<span>
			<span id="title">Chain ID:</span>
			{$chainId}
		</span>
    {#if $account.chain}
    <span>
      <span id="title">Network:</span>
      {$account.chain?.name}
    </span>
    <span>
      <span id="title">Decimals:</span>
      {$account.chain?.nativeCurrency.decimals}
    </span>
    <span>
      <span id="title">Currency:</span>
      {$account.chain?.nativeCurrency.name}
    </span>
    {/if}
	</Card>
{/if}

<style>
	#title {
		font-weight: 500;
	}
</style>
