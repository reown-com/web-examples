import { executeAbi } from './abis/Account'
import { Address, Hex, encodeFunctionData, encodeAbiParameters, encodePacked } from 'viem'

export const CALL_TYPE = {
  SINGLE: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
  BATCH: '0x0100000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
}
export type Execution = { to: Address; value: bigint; data: Hex }
export function encodeUserOpCallData({ actions }: { actions: Execution[] }): Hex {
  if (actions.length === 0) {
    throw new Error('No actions')
  }
  if (actions.length === 1) {
    const { to, value, data } = actions[0]
    return encodeFunctionData({
      functionName: 'execute',
      abi: executeAbi,
      args: [CALL_TYPE.SINGLE, encodePacked(['address', 'uint256', 'bytes'], [to, value, data])]
    })
  }

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
                name: 'to',
                type: 'address'
              },
              {
                name: 'value',
                type: 'uint256'
              },
              {
                name: 'data',
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
