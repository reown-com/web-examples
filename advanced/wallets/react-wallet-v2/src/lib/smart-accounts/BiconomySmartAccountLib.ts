import { SmartAccountClientConfig } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { signerToBiconomySmartAccount } from 'permissionless/accounts'
import { ENTRYPOINT_ADDRESSES } from '@/utils/SmartAccountUtil'

export class BiconomySmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig> {
    const biconomyAccount = await signerToBiconomySmartAccount(this.publicClient, {
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
      signer: this.signer,
    })
    return {
      account: biconomyAccount,
      //@ts-ignore
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
      chain: this.chain,
      transport: this.bundlerUrl,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
      }
    }
  }
}
