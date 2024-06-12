import { MULTI_FACTOR_VALIDATOR_ADDRESS } from '@rhinestone/module-sdk'
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
  moduleAddress: string
  moduleData: string
}
export const supportedModules: Module[] = [
  {
    name: 'PERMISSION',
    type: 1,
    moduleAddress: PERMISSION_VALIDATOR_ADDRESS,
    moduleData: '0x'
  },
  {
    name: 'MFA',
    type: 1,
    moduleAddress: MULTI_FACTOR_VALIDATOR_ADDRESS,
    moduleData: ''
  },
  {
    name: 'OWNABLE',
    type: 1,
    moduleAddress: OWNABLE_VALIDATOR_ADDRESS,
    moduleData: ''
  },
  {
    name: 'WEBAUTHN',
    type: 1,
    moduleAddress: WEBAUTHN_VALIDATOR_ADDRESS,
    moduleData: ''
  },
  {
    name: 'SCHEDULED ORDERS',
    type: 2,
    moduleAddress: SCHEDULED_ORDERS_EXECUTER_ADDRESS,
    moduleData: ''
  },
  {
    name: 'SCHEDULED TRANSFERS',
    type: 2,
    moduleAddress: SCHEDULED_TRANSFERS_EXECUTER_ADDRESS,
    moduleData: ''
  }
]
