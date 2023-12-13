<script lang="ts">
import { account, network } from '$lib/wagmi';
</script>

<div class="container" >
  <h1>Welcome to SvelteKit & Web3Modal</h1>
  <div>
    <div>user address: {$account.address}</div>
    <div>Connected chain: {$network.chain?.name}</div>
  </div>
  <w3m-button/>
</div>

<style>
  :global(*){
    margin: 0;
    padding: 0;
  }
  :global(body, html){
    width: 100%;
    min-height: 100vh;
  }

  .container{
    padding: 20px;
    text-align: center;

    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 100px;
  }
</style>
