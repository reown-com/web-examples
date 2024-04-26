import { executeAbi } from './abis/Account'
import { Address, Hex, encodeFunctionData, encodeAbiParameters, encodePacked } from 'viem'

export const CALL_TYPE = {
  SINGLE: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
  BATCH: '0x0100000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
}

export function encodeUserOpCallData({
  actions
}: {
  actions: { target: Address; value: string; callData: Hex }[]
}): Hex {
  if (actions.length === 0) {
    throw new Error('No actions')
  } else if (actions.length === 1) {
    const { target, value, callData } = actions[0]
    return encodeFunctionData({
      functionName: 'execute',
      abi: executeAbi,
      args: [
        CALL_TYPE.SINGLE,
        encodePacked(['address', 'uint256', 'bytes'], [target, BigInt(Number(value)), callData])
      ]
    })
  } else {
    return encodeFunctionData({
      functionName: 'execute',
      abi: executeAbi,
      args: [
        CALL_TYPE.BATCH,
        encodeAbiParameters(
          [
            {
              components: [
                {
                  name: 'target',
                  type: 'address'
                },
                {
                  name: 'value',
                  type: 'uint256'
                },
                {
                  name: 'callData',
                  type: 'bytes'
                }
              ],
              name: 'Execution',
              type: 'tuple[]'
            }
          ],
          // @ts-ignore
          [actions]
        )
      ]
    })
  }
}
