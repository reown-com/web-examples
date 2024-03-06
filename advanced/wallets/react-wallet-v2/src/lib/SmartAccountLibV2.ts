import { Chain } from "@/utils/SmartAccountUtils";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { Hex, PrivateKeyAccount, PublicClient, createPublicClient, http} from "viem";
import { privateKeyToAccount } from "viem/accounts";



type SmartAccountLibOptions = {
    privateKey: `0x${string}`
    chain: Chain
    sponsored?: boolean
  };
  

export class SmartAccountLibV2 {
    public chain: Chain
    public isDeployed: boolean = false;
    public address?: `0x${string}`;
    public sponsored: boolean = true;
    private signer: PrivateKeyAccount;


    #signerPrivateKey: `0x${string}`;

    public constructor({ privateKey, chain, sponsored = false }: SmartAccountLibOptions) {
        this.chain = chain
        this.sponsored = sponsored
        this.#signerPrivateKey = privateKey
        this.signer = privateKeyToAccount(privateKey as Hex)
      
    }
    async init(){
      
    }

  
}