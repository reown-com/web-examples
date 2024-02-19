<script>
	export let overflow = false
</script>

<span class="card">
	<span class="container" class:overflow>
		<slot />
	</span>
</span>

<style>
	.card {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 34px;
		height: 300px;
	}

	.container {
		width: max-content;
		max-width: 500px;
		height: 100%;
		display: flex;
		justify-content: flex-start;
		align-items: flex-start;
		flex-direction: column;
		font-weight: 400;
		font-size: 20px;

		background: linear-gradient(135deg, #272a2a 0, #141414 100%);
		border: 1px #3b4040 solid;
		color: #fff;
		border-radius: 0.5rem;
		padding: 30px 40px;
		gap: 20px;
	}

	.overflow {
		gap: 10px;
		overflow-y: auto;
		overflow-x: hidden;
	}

	@media (max-width: 540px) {
		.card {
			min-height: 300px;
		}

		.container {
			width: fit-content;
			max-width: 300px;
			overflow-y: auto;
			overflow-x: hidden;
		}
	}
</style>
