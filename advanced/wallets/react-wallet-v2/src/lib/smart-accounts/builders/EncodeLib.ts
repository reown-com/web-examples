import { SmartSessionMode } from '@biconomy/permission-context-builder'
import { LibZip } from 'solady'
import { Address, encodeAbiParameters, encodePacked, Hex } from 'viem'
import { enableSessionsStructAbi } from './SmartSessionUserOpBuilder'

type EnableSessions = {
  isigner: Address
  isignerInitData: Hex
  userOpPolicies: readonly { policy: Address; initData: Hex }[]
  erc1271Policies: readonly { policy: Address; initData: Hex }[]
  actions: readonly {
    actionId: Hex
    actionPolicies: readonly { policy: Address; initData: Hex }[]
  }[]
  permissionEnableSig: Hex
}

export function packMode(data: Hex, mode: SmartSessionMode, signerId: Hex): Hex {
  return encodePacked(['uint8', 'bytes32', 'bytes'], [mode, signerId, data])
}

export function encodeUse(signerId: Hex, sig: Hex) {
  const data = encodeAbiParameters([{ type: 'bytes' }], [sig])
  const compressedData = LibZip.flzCompress(data) as Hex
  return packMode(compressedData, SmartSessionMode.USE, signerId)
}

export function encodeEnable(signerId: Hex, sig: Hex, enableData: EnableSessions) {
  const data = encodeAbiParameters(
    [enableSessionsStructAbi[0], { type: 'bytes' }],
    [
      {
        ...enableData
      },
      sig
    ]
  )
  const compressedData = LibZip.flzCompress(data) as Hex
  return packMode(compressedData, SmartSessionMode.UNSAFE_ENABLE, signerId)
}
