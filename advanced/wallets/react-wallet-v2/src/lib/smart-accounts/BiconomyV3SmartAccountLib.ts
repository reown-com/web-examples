import { ENTRYPOINT_ADDRESS_V07, SmartAccountClientConfig } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { SmartAccount } from 'permissionless/accounts'
import { signerToBiconomySmartAccountV3 } from '@/utils/experimental/biconomy-v3/signerToBiconomySmartAccountV3'



export class BiconomyV3SmartAccountLib extends SmartAccountLib {

  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {

    if (this.entryPoint !== ENTRYPOINT_ADDRESS_V07) {
      throw new Error('Only entrypoint V7 is supported')
    }
    const biconomyV3Account = await signerToBiconomySmartAccountV3(this.publicClient, {
      entryPoint: this.entryPoint,
      signer: this.signer,
    })
    return {
      account: biconomyV3Account as SmartAccount<EntryPoint>,
      entryPoint: this.entryPoint,
      chain: this.chain,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined,
        // sponsorUserOperation: async (args) => { 
        //   const sponsored = await this.paymasterClient.sponsorUserOperation(args)
        //   sponsored.preVerificationGas = 250_000n
        //   return {
        //     ...sponsored,
        //     preVerificationGas: 250_000n
        //   }
        // }
      }
    }
  }
}
