export const executeAbi = [
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {
        name: 'mode',
        type: 'bytes32',
        internalType: 'ModeCode'
      },
      {
        name: 'executionCalldata',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'payable'
  }
] as const

export const isModuleInstalledAbi = [
  {
    type: 'function',
    name: 'isModuleInstalled',
    inputs: [
      { name: 'moduleType', type: 'uint256', internalType: 'uint256' },
      { name: 'module', type: 'address', internalType: 'address' },
      {
        name: 'additionalContext',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view'
  }
] as const
