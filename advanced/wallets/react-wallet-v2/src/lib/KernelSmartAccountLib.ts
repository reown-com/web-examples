import { Chain } from "@/utils/SmartAccountUtils";

import { Hex, PrivateKeyAccount, createPublicClient, http} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { EIP155Wallet } from "./EIP155Lib";
import { JsonRpcProvider } from "@ethersproject/providers";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { KernelAccountClient, createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { sepolia } from "viem/chains";

type SmartAccountLibOptions = {
    privateKey: string
    chain: Chain
    sponsored?: boolean
  };
  

export class KernelSmartAccountLib implements EIP155Wallet {
    public chain: Chain
    public isDeployed: boolean = false;
    public address?: `0x${string}`;
    public sponsored: boolean = true;
    private signer: PrivateKeyAccount;
    private client: KernelAccountClient | undefined


    #signerPrivateKey: string;

    public constructor({ privateKey, chain, sponsored = false }: SmartAccountLibOptions) {        
        this.chain = chain
        this.sponsored = sponsored
        this.#signerPrivateKey = privateKey
        this.signer = privateKeyToAccount(privateKey as Hex)
      
    }
    async init(){
        console.log('Initializing Smart Account');
        
        const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID
        if (!projectId) {
            throw new Error('ZeroDev project id expected')
        }
        const bundlerRpc = http(`https://rpc.zerodev.app/api/v2/bundler/${projectId}`)
        const publicClient = createPublicClient({
            transport: bundlerRpc,  // use your RPC provider or bundler
        })

        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: this.signer,
        })

        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
        })
        const client = createKernelAccountClient({
            account,
            chain: sepolia,
            transport: bundlerRpc,
        })
        //@ts-ignore
        this.client = client
        console.log('Smart account initialized',{address: account.address, chain: client.chain.name});
       
    }

    getMnemonic(): string {
        throw new Error("Method not implemented.");
    }
    getPrivateKey(): string {
        return this.#signerPrivateKey;
    }
    getAddress(): string {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
        return this.client.account?.address || ''
    }
    async signMessage(message: string): Promise<string> {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
        const signature = await this.client.account?.signMessage({message})
        return signature || ''
    }
    async _signTypedData(domain: any, types: any, data: any, _primaryType?: string | undefined): Promise<string> {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
        const primaryType = _primaryType || ''
        const signature = await this.client.account?.signTypedData({ domain, types, primaryType, message: data })
        return signature || ''
    }
    connect(provider: JsonRpcProvider): any {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
        return this.client
    }
    async signTransaction(transaction: any): Promise<string> {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
        const signature = await this.client.account?.signTransaction(transaction)
        return signature || ''
    }
  
}