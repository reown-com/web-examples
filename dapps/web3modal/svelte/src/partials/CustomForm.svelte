<script lang="ts">
	import { CUSTOM_WALLET } from "$lib/constants"
	import { customWallet } from "$lib/web3modal"

	function handleSubmit(){
		localStorage.setItem(CUSTOM_WALLET, JSON.stringify($customWallet))
		location.reload()
	}
</script>

<div id="title">Add a Custom Wallet to Web3Modal</div>
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
	#title{
		text-align: center;
		font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI',
			Roboto, Ubuntu, 'Helvetica Neue', sans-serif;
		font-weight: 600;
		font-size: 24px;
    width: 100%;
	}

	form{
		position: relative;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;

		width: 100%;
    max-width: 1000px;
		gap: 40px;
		padding-bottom: 100px;
	}

	label{
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 10px;
		width: 300px;

		font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI',
			Roboto, Ubuntu, 'Helvetica Neue', sans-serif;
		font-weight: 400;
		font-size: 14px;
	}

	input {
		border-radius: 10px;
		outline: 2px solid rgba(40, 144, 255, 0.8);
		border: 0;
		background-color: #e2e2e2;
		outline-offset: 3px;
		padding: 10px 1rem;
		transition: 0.25s;
		font-size: 15px;
	}

	input:focus {
		outline-offset: 5px;
		outline: 2px solid #2890ff;
		background-color: #fff
	}

	button {
		position: absolute;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;

		background: #FFFFFF;
		border: 0 solid #E2E8F0;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		box-sizing: border-box;
		color: #1A202C;
		font-size: 1rem;
		font-weight: 700;
		height: 45px;
		text-decoration: none;
		border-radius: 8px;
		cursor: pointer;
		width: 90px;
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}
</style>