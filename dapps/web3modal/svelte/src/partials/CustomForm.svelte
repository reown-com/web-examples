<script lang="ts">
	import { CUSTOM_WALLET } from "$lib/constants"
	import { customWallet } from "$lib/web3modal"

	function handleSubmit(){
		localStorage.setItem(CUSTOM_WALLET, JSON.stringify($customWallet))
		location.reload()
	}
</script>



<div>Add a Custom Wallet to Web3Modal</div>
<form on:submit|preventDefault={handleSubmit} >
  <label>
		Id
		<input name="id" type="text" bind:value={$customWallet.id}>
	</label>
  <label>
		Name
		<input name="name" type="text" bind:value={$customWallet.name}>
	</label>
  <label>
		Homepage (Optional)
		<input name="homepage" type="url" bind:value={$customWallet.homepage}>
	</label>
  <label>
		Image URL (Optional)
		<input name="image_url" type="url" bind:value={$customWallet.image_url}>
	</label>
  <label>
		Mobile Link (Optional - Deeplink)
		<input name="mobile_link" type="text" bind:value={$customWallet.mobile_link}>
	</label>
  <label>
		Desktop Link (Optional - Deeplink)
		<input name="desktop_link" type="text" bind:value={$customWallet.desktop_link}>
	</label>
  <label>
		Webapp Link (Optional)
		<input name="webapp_link" type="text" bind:value={$customWallet.webapp_link}>
	</label>
  <label>
		App Store (Optional)
		<input name="app_store" type="url" bind:value={$customWallet.app_store}>
	</label>
  <label>
		Play Store (Optional)
		<input name="play_store" type="url" bind:value={$customWallet.play_store}>
	</label>
  <button type="submit" >Apply</button>
</form>


<style>

</style>