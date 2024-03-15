import { SmartAccountClientConfig } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { signerToSafeSmartAccount } from 'permissionless/accounts'
import { ENTRYPOINT_ADDRESSES } from '@/utils/SmartAccountUtil'

export class SafeSmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig> {
    const safeAccount = await signerToSafeSmartAccount(this.publicClient, {
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
      signer: this.signer,
      safeVersion: '1.4.1'
    })
    return {
      account: safeAccount,
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
