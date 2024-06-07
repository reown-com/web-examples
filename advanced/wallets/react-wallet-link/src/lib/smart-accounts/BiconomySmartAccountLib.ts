import { ENTRYPOINT_ADDRESS_V06, SmartAccountClientConfig } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import {
  SmartAccount,
  signerToBiconomySmartAccount,
  signerToSafeSmartAccount
} from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'

export class BiconomySmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    this.type = 'Biconomy'
    if (this.entryPoint !== ENTRYPOINT_ADDRESS_V06) {
      throw new Error('Only entrypoint V6 is supported')
    }

    const biconomyAccount = await signerToBiconomySmartAccount(this.publicClient, {
      entryPoint: this.entryPoint,
      signer: this.signer
    })

    return {
      account: biconomyAccount as SmartAccount<EntryPoint>,
      entryPoint: this.entryPoint,
      chain: this.chain,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
      }
    }
  }
}
