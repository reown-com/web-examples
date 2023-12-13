import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { type Chain, createWalletClient, formatEther, createPublicClient, http } from 'viem'
import { createPimlicoBundlerClient } from 'permissionless/clients/pimlico'

export type SmartAccountEnabledChains = 'sepolia' | 'goerli'

// -- Helpers -----------------------------------------------------------------
const bundlerApiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

// -- Sdk ---------------------------------------------------------------------
export class SmartAccountLib {
  public chain: Chain
  private bundlerApiKey: string
  #signerPrivateKey: `0x${string}`;
  public isDeployed: boolean = false;
  public address?: `0x${string}`;

  public constructor(privateKey: `0x${string}`, chain: SmartAccountEnabledChains = 'goerli') {
    if (!bundlerApiKey) {
      throw new Error('Missing required data in SmartAccountSdk')
    }
    this.bundlerApiKey = bundlerApiKey
    this.chain = chains[chain] as Chain
    this.#signerPrivateKey = privateKey
  }

  // -- Public ------------------------------------------------------------------


  // -- Private -----------------------------------------------------------------
  private getWalletConnectTransport = () => http(
    `https://rpc.walletconnect.com/v1/?chainId=EIP155:${this.chain.id}&projectId=${projectId}`,
    { retryDelay: 1000 }
  );

  private getBundlerTransport = () => http(
    `https://api.pimlico.io/v1/${this.chain.name.toLowerCase()}/rpc?apikey=${this.bundlerApiKey}`,
    { retryDelay: 1000 }
  );

  
  private getBundlerClient = () => createPimlicoBundlerClient({
    chain: this.chain,
    transport: this.getBundlerTransport()
  })

  private getPublicClient = () => createPublicClient({
    chain: this.chain,
    transport: this.getWalletConnectTransport()
  })

  private getSignerClient = () => {
    const signerAccount = privateKeyToAccount(this.#signerPrivateKey)
    return createWalletClient({
      account: signerAccount,
      chain: this.chain,
      transport: this.getWalletConnectTransport()
    })
  }

  private getSmartAccountClient = async () => {  
    const smartAccount = await privateKeyToSafeSmartAccount(this.getPublicClient(), {
      privateKey: this.#signerPrivateKey,
      safeVersion: '1.4.1',
      entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
    })
  
    return createSmartAccountClient({
      account: smartAccount,
      chain: this.chain,
      transport: this.getBundlerTransport()
    })
  }

  private prefundSmartAccount = async (address: `0x${string}`) => {
    const signerAccountViemClient = this.getSignerClient();
    const publicClient = this.getPublicClient();
    const bundlerClient = this.getBundlerClient();
    const smartAccountBalance = await publicClient.getBalance({ address })
  
    console.log(`Smart Account Balance: ${formatEther(smartAccountBalance)} ETH`)
    if (smartAccountBalance < 1n) {
      console.log(`Smart Account has no balance. Starting prefund`)
      const { fast: fastPrefund } = await bundlerClient.getUserOperationGasPrice()
      const prefundHash = await signerAccountViemClient.sendTransaction({
        to: address,
        value: 10000000000000000n,
        maxFeePerGas: fastPrefund.maxFeePerGas,
        maxPriorityFeePerGas: fastPrefund.maxPriorityFeePerGas
      })
  
      await publicClient.waitForTransactionReceipt({ hash: prefundHash })
      console.log(`Prefunding Success`)
  
      const newSmartAccountBalance = await publicClient.getBalance({ address })
      console.log(
        `Smart Account Balance: ${formatEther(newSmartAccountBalance)} ETH`
      )
    }
  }

  // By default first transaction will deploy the smart contract if it hasn't been deployed yet
  public sendTestTransaction = async () => {
    const publicClient = this.getPublicClient();
    const bundlerClient = this.getBundlerClient();
    const smartAccountClient = await this.getSmartAccountClient();
    const { fast: testGas, } = await bundlerClient.getUserOperationGasPrice()

    const testHash = await smartAccountClient.sendTransaction({
      to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as `0x${string}`,
      value: 0n,
      maxFeePerGas: testGas.maxFeePerGas,
      maxPriorityFeePerGas: testGas.maxPriorityFeePerGas,
    })

    console.log(`Sending Test Transaction With Hash: ${testHash}`)

    await publicClient.waitForTransactionReceipt({ hash: testHash })
    console.log(`Test Transaction Success`)
  }

  public checkIfSmartAccountDeployed = async () => {
    console.log('checking if deployed')
    const smartAccountClient = await this.getSmartAccountClient();
    const publicClient = this.getPublicClient();
    const bytecode = await publicClient.getBytecode({ address: smartAccountClient.account.address })
    this.isDeployed = Boolean(bytecode)
    console.log(`Smart Account Deployed: ${this.isDeployed}`)
    if (this.isDeployed) {
      this.address = smartAccountClient.account.address
    }
    return this.isDeployed;
}

  public deploySmartAccount = async () => {
    const smartAccountClient = await this.getSmartAccountClient();
    const isDeployed = await this.checkIfSmartAccountDeployed()
    if (!isDeployed) {
    // If not deployed, prefund smart account from signer
        // Step 3: Send prefund transaction from signer to smart account if empty
        await this.prefundSmartAccount(smartAccountClient.account.address)

        // Step 4: Create account by sending test tx
        await this.sendTestTransaction()
        await this.checkIfSmartAccountDeployed()
        console.log(`Account Created`)
    }
  }
}
