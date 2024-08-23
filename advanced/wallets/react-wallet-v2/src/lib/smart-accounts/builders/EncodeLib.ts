import { EnableSessions, SmartSessionMode } from '@biconomy/permission-context-builder'
import { ethers } from 'ethers'
import { LibZip } from 'solady'
import { encodePacked, Hex } from 'viem'

export function packMode(data: Hex, mode: SmartSessionMode, signerId: Hex): Hex {
  return encodePacked(['uint8', 'bytes32', 'bytes'], [mode, signerId, data])
}

export function encodeUse(signerId: Hex, sig: Hex) {
  const data = ethers.utils.defaultAbiCoder.encode(['bytes'], [sig])
  const compressedData = LibZip.flzCompress(data) as Hex // abi.encode(sig).
  return packMode(compressedData, SmartSessionMode.USE, signerId)
}

export function encodeEnable(signerId: Hex, sig: Hex, enableData: EnableSessions) {
  const data = ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(address isigner, bytes isignerInitData, tuple(address policy, bytes initData)[] userOpPolicies, tuple(address policy, bytes initData)[] erc1271Policies, tuple(bytes32 actionId, tuple(address policy, bytes initData)[] actionPolicies)[] actions, bytes permissionEnableSig)',
      'bytes'
    ],
    [
      {
        isigner: enableData.isigner,
        isignerInitData: enableData.isignerInitData,
        userOpPolicies: enableData.userOpPolicies,
        erc1271Policies: enableData.erc1271Policies,
        actions: enableData.actions.map(action => ({
          actionId: action.actionId,
          actionPolicies: action.actionPolicies
        })),
        permissionEnableSig: enableData.permissionEnableSig
      },
      sig
    ]
  )
  const compressedData = LibZip.flzCompress(data) as Hex // abi.encode(sig).
  return packMode(compressedData, SmartSessionMode.UNSAFE_ENABLE, signerId)
}
