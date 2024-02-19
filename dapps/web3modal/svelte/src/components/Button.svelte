<button on:click>
	<slot />
</button>

<style>
	button {
		background-color: #2890ff;
		color: #ffffff;
		cursor: pointer;
		border: none;
		padding: 0px 15px 1px;
		height: 40px;
		border-radius: 50px;

		font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI',
			Roboto, Ubuntu, 'Helvetica Neue', sans-serif;
		font-weight: 600;
		font-size: 16px;
		line-height: 20px;
	}
</style>
