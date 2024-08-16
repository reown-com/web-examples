import { smartSessionAddress } from '@biconomy/permission-context-builder'
import { ModuleType } from '@rhinestone/module-sdk'
//Note: ES6 syntax dont work for this package
const {
  MULTI_FACTOR_VALIDATOR_ADDRESS,
  OWNABLE_VALIDATOR_ADDRESS,
  WEBAUTHN_VALIDATOR_ADDRESS,
  SCHEDULED_ORDERS_EXECUTER_ADDRESS,
  SCHEDULED_TRANSFERS_EXECUTER_ADDRESS
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

export type ModuleView =
  | 'PermissionValidatorActions'
  | 'OwnableValidatorActions'
  | 'MFAValidatorActions'
  | 'WebAuthnValidatorActions'
  | 'ScheduleOrdersExecutorActions'
  | 'ScheduleTransfersExecutorActions'

export type Module = {
  name: string
  type: ModuleType
  url: string
  description: string
  moduleAddress: string
  moduleData: string
  view?: ModuleView
}
export const supportedModules: Module[] = [
  {
    name: 'Permission Validator',
    type: 'validator',
    url: '/permission-validator',
    moduleAddress: smartSessionAddress,
    description: `The Permission Validator module is a module that allows DApp to request permissions from a wallet in order to execute transactions on users's behalf that is scoped with permissions`,
    moduleData: '0x'
  },
  {
    name: 'Ownable Validator',
    type: 'validator',
    url: '/ownable-validator',
    moduleAddress: OWNABLE_VALIDATOR_ADDRESS,
    description: `The Ownable Validator module is a module that allows you to add multiple ECDSA owners to an account.
     The owners can then be used to sign transactions to be executed on the account.`,
    moduleData: '',
    view: 'OwnableValidatorActions'
  },
  {
    name: `Muti-factor Validator`,
    type: 'validator',
    url: '/mfa-validator',
    moduleAddress: MULTI_FACTOR_VALIDATOR_ADDRESS,
    description: `The MFA Validator module is a module that allows you to add multi-factor validation to an account. The MFA Validator module is used to validate transactions and other executions on the account.`,
    moduleData: ''
  },
  {
    name: 'WebAuthn Validator',
    type: 'validator',
    url: '/webauthn-validator',
    moduleAddress: WEBAUTHN_VALIDATOR_ADDRESS,
    description: 'Coming Soon',
    moduleData: ''
  },
  {
    name: 'Schedule Orders Executor',
    type: 'executor',
    url: 'schedule-orders-executor',
    moduleAddress: SCHEDULED_ORDERS_EXECUTER_ADDRESS,
    description: `The Scheduled Orders module allows users to schedule swaps to be executed at a later time, with an optional recurring schedule. This module is an executor that is installed on an account and can be triggered by an automation service at the pre-specified time(s).`,
    moduleData: ''
  },
  {
    name: 'Schedule Transfers Executor',
    type: 'executor',
    url: '/schedule-transfers-executor',
    moduleAddress: SCHEDULED_TRANSFERS_EXECUTER_ADDRESS,
    description: `The Scheduled Transfers module allows users to schedule token transfers to occur at a future time, with an optional recurring schedule. It is an executor that is installed on an account and can be triggered by an automation service at the pre-specified time(s).`,
    moduleData: ''
  }
]
