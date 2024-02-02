<script>
	import '../css/global.css'
	import '../lib/web3modal'
</script>

<div class="container">
	<a
		href="https://walletconnect.com/"
		target="_blank"
		rel="noreferrer nofollow"
	>
		<img src="walletconnect.svg" alt="WalletConnect" />
	</a>
	<span class="btn">
		<w3m-button />
		<a
			href="https://github.com/WalletConnect/evm-e2e-dapp"
			target="_blank"
			rel="noreferrer nofollow"
		>
			<img src="github.svg" alt="GitHub" />
		</a>
	</span>
</div>
<slot />

<style>
	.container {
		padding: 20px;
		height: 90px;
		text-align: center;

		display: flex;
		align-items: center;
		justify-content: space-around;
		gap: 100px;

		margin-bottom: 40px;

		font-size: 34px;
		font-weight: 600;
	}

	.container img {
		width: 80px;
		height: auto;
	}

	.btn img {
		width: 40px;
		height: auto;
	}
	.btn a {
		transition: all 0.2s ease;
	}

	.btn a:hover {
		transform: scale(1.1);
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 30px;
	}

	@media (max-width: 540px) {
		.container {
			gap: 0;
		}
		.btn {
			gap: 10px;
		}
	}
</style>
