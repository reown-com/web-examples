import { BundlerActions, BundlerClient, bundlerActions, createSmartAccountClient, getAccountNonce } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, formatEther, createPublicClient, http, Address, Hex, PublicClient, createClient, WalletClient } from 'viem'
import { PimlicoPaymasterClient, createPimlicoPaymasterClient } from 'permissionless/clients/pimlico'
import { UserOperation } from 'permissionless/types'
import { providers } from 'ethers'
import { PimlicoBundlerActions, pimlicoBundlerActions } from 'permissionless/actions/pimlico'
import { Chain, ENTRYPOINT_ADDRESSES, PAYMASTER_ADDRESSES, USDC_ADDRESSES, VITALIK_ADDRESS, approveUSDCSpendCallData, bundlerUrl, paymasterUrl, publicRPCUrl } from '@/utils/SmartAccountUtils'

type SmartAccountLibOptions = {
  privateKey: `0x${string}`
  chain: Chain
  sponsored?: boolean
};

// -- Helpers -----------------------------------------------------------------
const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

// -- Sdk ---------------------------------------------------------------------
export class SmartAccountLib {
  public chain: Chain
  public isDeployed: boolean = false;
  public address?: `0x${string}`;
  public sponsored: boolean = true;
  
  private publicClient: PublicClient
  private paymasterClient: PimlicoPaymasterClient
  private bundlerClient: BundlerClient & BundlerActions & PimlicoBundlerActions
  private signerClient: WalletClient

  #signerPrivateKey: `0x${string}`;


  public constructor({ privateKey, chain, sponsored = true }: SmartAccountLibOptions) {
    if (!pimlicoApiKey) {
      throw new Error('A Pimlico API Key is required')
    }

    this.chain = chain
    this.sponsored = sponsored
    this.#signerPrivateKey = privateKey
    this.publicClient = createPublicClient({
      transport: http(publicRPCUrl({ chain: this.chain }))
    })

    this.paymasterClient = createPimlicoPaymasterClient({
      transport: http(paymasterUrl({ chain: this.chain }))
    })

    this.bundlerClient = createClient({
      transport: http(bundlerUrl({ chain: this.chain })),
      chain: this.chain
    })
      .extend(bundlerActions)
      .extend(pimlicoBundlerActions)

    this.signerClient = createWalletClient({
      account: privateKeyToAccount(this.#signerPrivateKey),
      chain: this.chain,
      transport: http(publicRPCUrl({ chain: this.chain }))
    })

  }


  // -- Private -----------------------------------------------------------------
  private getSmartAccountClient = async (
    sponsorUserOperation?: (args: {
      userOperation: UserOperation
      entryPoint: Address
    }) => Promise<UserOperation>
  ) => {
    const account = await this.getAccount()
    return createSmartAccountClient({
      account,
      chain: this.chain,
      transport: http(bundlerUrl({ chain: this.chain })),
      sponsorUserOperation: sponsorUserOperation
        ? sponsorUserOperation
        : this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
    }).extend(pimlicoBundlerActions)
  }

  public getNonce = async () => {
    const smartAccountClient = await this.getSmartAccountClient()
    return getAccountNonce(this.publicClient, {
      sender: smartAccountClient.account.address as Hex,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name]
    })
  }

  private prefundSmartAccount = async (address: `0x${string}`) => {
    if (this.sponsored) {
      return
    }

    const smartAccountBalance = await this.publicClient.getBalance({ address })

    console.log(`Smart Account Balance: ${formatEther(smartAccountBalance)} ETH`)
    if (smartAccountBalance < 1n) {
      console.log(`Smart Account has no balance. Starting prefund`)
      const { fast: fastPrefund } = await this.bundlerClient.getUserOperationGasPrice()
      const prefundHash = await this.signerClient.sendTransaction({
        to: address,
        chain: this.chain,
        account: this.signerClient.account!,
        value: 10000000000000000n,
        maxFeePerGas: fastPrefund.maxFeePerGas,
        maxPriorityFeePerGas: fastPrefund.maxPriorityFeePerGas
      })

      await this.publicClient.waitForTransactionReceipt({ hash: prefundHash })
      console.log(`Prefunding Success`)

      const newSmartAccountBalance = await this.publicClient.getBalance({ address })
      console.log(
        `Smart Account Balance: ${formatEther(newSmartAccountBalance)} ETH`
      )
    }
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
      address: USDC_ADDRESSES[this.chain.name] as Hex,
      functionName: "balanceOf",
      args: [this.address!]
    }
    const usdcBalance = await this.publicClient.readContract(params) as bigint
    return usdcBalance
  }

  private sponsorUserOperation = async ({ userOperation }: { userOperation: UserOperation }) => {
    const userOperationWithPaymasterAndData = {
      ...userOperation,
      paymasterAndData: PAYMASTER_ADDRESSES[this.chain.name]
    }

    console.log('Estimating gas limits...', userOperationWithPaymasterAndData)

    const gasLimits = await this.bundlerClient.estimateUserOperationGas({
      userOperation: userOperationWithPaymasterAndData,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name]
    })

    return {
      ...userOperationWithPaymasterAndData,
      callGasLimit: gasLimits.callGasLimit,
      verificationGasLimit: gasLimits.verificationGasLimit,
      preVerificationGas: gasLimits.preVerificationGas
    }
  }

  // -- Public ------------------------------------------------------------------
  public async init() {
    await this.checkIfSmartAccountDeployed()
    this.address = (await this.getAccount()).address
  }

  public getAccount = async () => {
    const account = await privateKeyToSafeSmartAccount(this.publicClient, {
      privateKey: this.#signerPrivateKey,
      safeVersion: '1.4.1', // simple version
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name], // global entrypoint
      setupTransactions: [
        {
          to: USDC_ADDRESSES[this.chain.name],
          value: 0n,
          data: approveUSDCSpendCallData({
            to: PAYMASTER_ADDRESSES[this.chain.name],
            amount: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
          })
        }
      ]
    })
    this.address = account.address
    
    return account;
  }

  static isSmartAccount = async (address: Address, chain: Chain) => {
    const client = createPublicClient({
      chain,
      transport: http(
        `https://rpc.walletconnect.com/v1/?chainId=EIP155:${chains.goerli.id}&projectId=${projectId}`,
        { retryDelay: 1000 }
      )
    })
    const bytecode = await client.getBytecode({ address })
    return Boolean(bytecode)
  }
  
  public sendTransaction = async ({
    to,
    value,
    data
  }: { to: Address; value: bigint; data: Hex }) => {
    console.log(`Sending Transaction to ${to} with value ${value.toString()} and data ${data}`)
    const smartAccountClient = await this.getSmartAccountClient()
    const gasPrices = await smartAccountClient.getUserOperationGasPrice()
    return smartAccountClient.sendTransaction({
      to,
      value,
      data,
      maxFeePerGas: gasPrices.fast.maxFeePerGas,
      maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas
    })
  }

  public signMessage = async (message: string) => {
    const client = await this.getSmartAccountClient()
    return client.signMessage({ message })
  }
  public _signTypedData = async (domain: any, types: any, data: any, primaryType: any) => {
    const client = await this.getSmartAccountClient()
    return client.signTypedData({ account: client.account, domain, types, primaryType, message: data })
  }

  public connect = async (_provider: providers.JsonRpcProvider) => {
    return this.getSmartAccountClient()
  }

  public signTransaction = async (transaction: any) => {
    const smartAccountClient = await this.getSmartAccountClient()
    return smartAccountClient.account.signTransaction(transaction)
  }

  public sendUSDCSponsoredTransaction = async ({
    to,
    value,
    data
  }: { to: Address; value: bigint; data: Hex }) => {
    // 1. Check USDC Balance on smart account
    const usdcBalance = await this.getSmartAccountUSDCBalance()

    if (usdcBalance < 1_000_000n) {
        throw new Error(
            `insufficient USDC balance for counterfactual wallet address ${this.address}: ${
                Number(usdcBalance) / 1000000
            } USDC, required at least 1 USDC`
        )
    }

    const smartAccountClient = await this.getSmartAccountClient(this.sponsorUserOperation)
    const gasPrices = await smartAccountClient.getUserOperationGasPrice()

    return smartAccountClient.sendTransaction({
      to,
      value,
      data,
      maxFeePerGas: gasPrices.fast.maxFeePerGas,
      maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas
    })
  }


  public checkIfSmartAccountDeployed = async () => {
    const smartAccountClient = await this.getSmartAccountClient();
    console.log('Checking if deployed', smartAccountClient.account.address, this.chain.name)
    
    const bytecode = await this.publicClient.getBytecode({ address: smartAccountClient.account.address })
    this.isDeployed = Boolean(bytecode)
    
    console.log(`Smart Account Deployed: ${this.isDeployed}`)
  
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
        await this.sendTransaction({
          to: VITALIK_ADDRESS,
          value: 0n,
          data: '0x'
        })
        await this.checkIfSmartAccountDeployed()
        console.log(`Account Created`)
    }
  }
}
