import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07, SmartAccountClientConfig } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount } from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { signerToSafe7579SmartAccount } from '@/utils/safe7579AccountUtils/signerToSafe7579SmartAccount'

export class SafeSmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    if (this.entryPoint === ENTRYPOINT_ADDRESS_V06) {
      throw new Error('Only entrypoint V7 is supported')
    }

    // const safeAccount = await signerToSafeSmartAccount(this.publicClient, {
    //   entryPoint: this.entryPoint,
    //   signer: this.signer,
    //   safeVersion: '1.4.1'
    // })
    const safeAccount = await signerToSafe7579SmartAccount(this.publicClient, {
      entryPoint: this.entryPoint,
      signer: this.signer,
    })
    return {
      name:'Safe7579SmartAccount',
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
