import { ENTRYPOINT_ADDRESS_V06, SmartAccountClientConfig } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount, signerToSafeSmartAccount } from 'permissionless/accounts'
import { ENTRYPOINT_ADDRESSES } from '@/utils/SmartAccountUtil'
import { EntryPoint } from 'permissionless/types/entrypoint'

export class SafeSmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    if (this.entryPoint !== ENTRYPOINT_ADDRESS_V06) {
      throw new Error('Only entrypoint V6 is supported')
    }

    const safeAccount = await signerToSafeSmartAccount(this.publicClient, {
      entryPoint: this.entryPoint,
      signer: this.signer,
      safeVersion: '1.4.1'
    })
    return {
      account: safeAccount as SmartAccount<EntryPoint>,
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
