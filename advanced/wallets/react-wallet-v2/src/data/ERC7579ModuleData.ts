// import {MULTI_FACTOR_VALIDATOR_ADDRESS} from '@rhinestone/module-sdk'
const moduleSdk = require('@rhinestone/module-sdk')
export const moduleTypeIds = {
  validator: 1,
  executor: 2,
  fallback: 3,
  hook: 4
}
// const MFA_VALIDATOR_ADDRESS = '0x2f28bcd0f3de8845409b947d9de45ca5ed776767'
const OWNABLE_VALIDATOR_ADDRESS = '0xf83d07238a7C8814a48535035602123Ad6DbfA63'
const WEBAUTHN_VALIDATOR_ADDRESS = '0x1C936be884Ce91ECFbDD10c7898C22b473eaB81a'
const SCHEDULED_ORDERS_EXECUTER_ADDRESS = '0x506a89d85a9733225fdb54d9e7e76d017c21e1c1'
const SCHEDULED_TRANSFERS_EXECUTER_ADDRESS = '0xad6330089d9a1fe89f4020292e1afe9969a5a2fc'
const PERMISSION_VALIDATOR_ADDRESS = '0x6671AD9ED29E2d7a894E80bf48b7Bf03Ee64A0f4'

export type Module = {
  name: string
  type: number
  description: string
  moduleAddress: string
  moduleData: string
}
export const supportedModules: Module[] = [
  {
    name: 'Permission Validator',
    type: 1,
    moduleAddress: PERMISSION_VALIDATOR_ADDRESS,
    description: `The Permission Validator module is a module that allows DApp to request permissions from a wallet in order to execute transactions on users's behalf that is scoped with permissions`,
    moduleData: '0x'
  },
  {
    name: `Muti-factor Validation`,
    type: 1,
    moduleAddress: moduleSdk.MULTI_FACTOR_VALIDATOR_ADDRESS,
    description: `The MFA Validator module is a module that allows you to add multi-factor validation to an account. The MFA Validator module is used to validate transactions and other executions on the account.`,
    moduleData: ''
  },
  {
    name: 'OWNABLE',
    type: 1,
    moduleAddress: OWNABLE_VALIDATOR_ADDRESS,
    description: `The Ownable Validator module is a module that allows you to add multiple ECDSA owners to an account.
     The owners can then be used to sign transactions to be executed on the account.`,
    moduleData: ''
  },
  {
    name: 'WEBAUTHN',
    type: 1,
    moduleAddress: WEBAUTHN_VALIDATOR_ADDRESS,
    description: 'Coming Soon',
    moduleData: ''
  },
  {
    name: 'SCHEDULED ORDERS',
    type: 2,
    moduleAddress: SCHEDULED_ORDERS_EXECUTER_ADDRESS,
    description: 'Coming Soon',
    moduleData: ''
  },
  {
    name: 'SCHEDULED TRANSFERS',
    type: 2,
    moduleAddress: SCHEDULED_TRANSFERS_EXECUTER_ADDRESS,
    description: 'Coming Soon',
    moduleData: ''
  }
]
