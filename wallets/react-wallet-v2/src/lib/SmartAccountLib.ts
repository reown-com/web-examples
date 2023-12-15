import { createSmartAccountClient, getAccountNonce, signUserOperationHashWithECDSA } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { type Chain, createWalletClient, formatEther, createPublicClient, http, Address, Hex } from 'viem'
import { createPimlicoBundlerClient, createPimlicoPaymasterClient } from 'permissionless/clients/pimlico'
import { UserOperation } from 'permissionless/types'
import { GOERLI_PAYMASTER_ADDRESS, GOERLI_USDC_ADDRESS, genereteApproveCallData, genereteDummyCallData } from '@/utils/ERC20PaymasterUtil'
import { ERC20Paymaster } from '@pimlico/erc20-paymaster'
import { StaticJsonRpcProvider } from "@ethersproject/providers";

export const smartAccountEnabledChains = ['sepolia', 'goerli'] as const
export type SmartAccountEnabledChains = typeof smartAccountEnabledChains[number]
type SmartAccountLibOptions = {
  privateKey: `0x${string}`
  chain: SmartAccountEnabledChains
  sponsored?: boolean
};

const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

// -- Helpers -----------------------------------------------------------------
const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

// -- Sdk ---------------------------------------------------------------------
export class SmartAccountLib {
  public chain: Chain
  private pimlicoApiKey: string
  #signerPrivateKey: `0x${string}`;
  public isDeployed: boolean = false;
  public address?: `0x${string}`;
  public sponsored: boolean = true;


  public constructor({ privateKey, chain, sponsored = true }: SmartAccountLibOptions) {
    if (!pimlicoApiKey) {
      throw new Error('Missing required data in SmartAccountSdk')
    }
    this.pimlicoApiKey = pimlicoApiKey
    this.chain = chains[chain] as Chain
    this.#signerPrivateKey = privateKey
    this.sponsored = sponsored
  }

  // -- Public ------------------------------------------------------------------


  // -- Private -----------------------------------------------------------------
  private get walletConnectTransport() {
    return http(
      `https://rpc.walletconnect.com/v1/?chainId=EIP155:${this.chain.id}&projectId=${projectId}`,
      { retryDelay: 1000 }
    )
  }

  private get bundlerTransport() {
    return http(
      `https://api.pimlico.io/v1/${this.chain.name.toLowerCase()}/rpc?apikey=${this.pimlicoApiKey}`,
      { retryDelay: 1000 }
    )
  }

  private get paymasterTransport() {
    return http(
      `https://api.pimlico.io/v2/${this.chain.name.toLowerCase()}/rpc?apikey=${this.pimlicoApiKey}`,
      { retryDelay: 1000 }
    )
  }

  
  private get bundlerClient() {
    return createPimlicoBundlerClient({
      chain: this.chain,
      transport: this.bundlerTransport
    })
  }

  private get publicClient() {
    return createPublicClient({
      chain: this.chain,
      transport: this.walletConnectTransport
    })
  }

  private get paymasterClient() {
    return createPimlicoPaymasterClient({
      chain: this.chain,
      transport: this.paymasterTransport
    })
  }

  private get signerClient(){
    const signerAccount = privateKeyToAccount(this.#signerPrivateKey)
    return createWalletClient({
      account: signerAccount,
      chain: this.chain,
      transport: this.walletConnectTransport
    })
  }

  private  getAccountNonce() {
    return getAccountNonce(this.publicClient, {
      entryPoint: ENTRY_POINT_ADDRESS,
      sender: this.address as Address
    })
  }

  private getSmartAccountClient = async () => {  
    const smartAccount = await privateKeyToSafeSmartAccount(this.publicClient, {
      privateKey: this.#signerPrivateKey,
      safeVersion: '1.4.1',
      entryPoint: ENTRY_POINT_ADDRESS
    })
  
    return createSmartAccountClient({
      account: smartAccount,
      chain: this.chain,
      transport: this.bundlerTransport,
      sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined,
    })
  }

  private prefundSmartAccount = async (address: `0x${string}`) => {
    const signerAccountViemClient = this.signerClient
    const publicClient = this.publicClient;
    const bundlerClient = this.bundlerClient;
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

  private prepareSponsoredUserOperation = async (callData: Hex, paymaster?: Hex) => {
    // 1. Get new nonce
    const newNonce = await this.getAccountNonce()

    // 2. Get gas price
    const { fast } = await this.bundlerClient.getUserOperationGasPrice()

    // 3. Generate dummy user operation with empty transfer to vitalik
    const sponsoredUserOperation: UserOperation = {
      sender: this.address as Address,
      nonce: newNonce,
      initCode: "0x",
      callData: callData,
      callGasLimit: 100_000n, // hardcode it for now at a high value
      verificationGasLimit: 500_000n, // hardcode it for now at a high value
      preVerificationGas: 50_000n, // hardcode it for now at a high value
      maxFeePerGas: fast.maxFeePerGas,
      maxPriorityFeePerGas: fast.maxPriorityFeePerGas,
      paymasterAndData: paymaster ?? '0x', // to use the erc20 paymaster, put its address in the paymasterAndData field
      signature: "0x"
    }

    //4. Sign the userop
    sponsoredUserOperation.signature = await signUserOperationHashWithECDSA({
      account: this.signerClient.account,
      userOperation: sponsoredUserOperation,
      chainId: this.chain.id,
      entryPoint: ENTRY_POINT_ADDRESS
    })

    return sponsoredUserOperation;
  }

  // By default first transaction will deploy the smart contract if it hasn't been deployed yet
  public sendTestTransaction = async () => {
    const publicClient = this.publicClient;
    const bundlerClient = this.bundlerClient;
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

  public signMessage = async (message: string) => {
    const client = await this.getSmartAccountClient()
    return client.signMessage({ message })
  }

  private submitUserOperation = async (userOperation: UserOperation) => {
    const userOperationHash = await this.bundlerClient.sendUserOperation({
        userOperation,
        entryPoint: ENTRY_POINT_ADDRESS
    })
    console.log(`UserOperation submitted. Hash: ${userOperationHash}`)
 
    console.log("Querying for receipts...")
    const receipt = await this.bundlerClient.waitForUserOperationReceipt({
        hash: userOperationHash
    })
    console.log(`Receipt found!\nTransaction hash: ${receipt.receipt.transactionHash}`)
  }

  private approveUSDC = async () => {
    const approveCallData = genereteApproveCallData(GOERLI_USDC_ADDRESS, GOERLI_PAYMASTER_ADDRESS)
    const gasPriceResult = await this.bundlerClient.getUserOperationGasPrice()
    const nonce = await this.getAccountNonce()

    const smartAccountClient = await this.getSmartAccountClient();
    console.log(`Approving USDC for ${this.address} with nonce ${nonce}`)
    const hash = await smartAccountClient.sendTransaction({
      to: GOERLI_USDC_ADDRESS,
      value: 0n,
      maxFeePerGas: gasPriceResult.fast.maxFeePerGas,
      maxPriorityFeePerGas: gasPriceResult.fast.maxPriorityFeePerGas,
      data: approveCallData,
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    console.log(`USDC Approval Success`)
  }

  private getSmartAccountUSDCBalance = async () => {
    const params = {
      abi: [
          {
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
          }
      ],
      address: GOERLI_USDC_ADDRESS as Hex,
      functionName: "balanceOf",
      args: [this.address!]
    }
    const usdcBalance = await this.publicClient.readContract(params) as bigint
    return usdcBalance
  }

  public sendUSDCSponsoredTransaction = async () => {
    // 1. Check USDC Balance on smart account
    const usdcBalance = await this.getSmartAccountUSDCBalance()
    
    if (usdcBalance < 1_000_000n) {
        throw new Error(
            `insufficient USDC balance for counterfactual wallet address ${this.address}: ${
                Number(usdcBalance) / 1000000
            } USDC, required at least 1 USDC`
        )
    }

    

    // 2. Approve USDC usage (currently sponsored by Pimlico veridfy paymaster)
    await this.approveUSDC()

    // 3. Send transaction
    const dummyCallData = genereteDummyCallData()
    const paymaster = new ERC20Paymaster(new StaticJsonRpcProvider(), GOERLI_PAYMASTER_ADDRESS)
    const userOperation = await this.prepareSponsoredUserOperation(dummyCallData, GOERLI_PAYMASTER_ADDRESS)

    await this.submitUserOperation(userOperation)
  }


  public checkIfSmartAccountDeployed = async () => {
    console.log('checking if deployed')
    const smartAccountClient = await this.getSmartAccountClient();
    const publicClient = this.publicClient;
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
