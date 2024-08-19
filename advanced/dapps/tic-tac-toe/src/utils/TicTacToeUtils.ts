import { parseEther } from 'viem'
import { ticTacToeAbi } from './abi'
import { GrantPermissionsParameters } from 'viem/experimental'

export const ticTacToeAddress = '0xC77189Ad823767366b1c5459029CE638ef5AEc12' as `0x${string}`

export function getTicTacToeAsyncPermissions(keys: string[]): GrantPermissionsParameters {
  return {
    expiry: Date.now() + 24 * 60 * 60,
    permissions: [
      {
        type: {
          custom: 'tic-tac-toe-move'
        },
        data: {
          target: ticTacToeAddress,
          abi: ticTacToeAbi,
          valueLimit: parseEther('0').toString(),
          functionName: 'function makeMove(uint256,uint8)'
        },
        policies: []
      }
    ],
    signer: {
      type: 'keys',
      data: {
        ids: keys
      }
    }
  }
}
