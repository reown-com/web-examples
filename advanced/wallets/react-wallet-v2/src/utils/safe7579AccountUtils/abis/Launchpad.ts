export const initSafe7579Abi = [
  {
    type: 'function',
    name: 'initSafe7579',
    inputs: [
      { name: 'safe7579', type: 'address', internalType: 'address' },
      {
        name: 'executors',
        type: 'tuple[]',
        internalType: 'struct ModuleInit[]',
        components: [
          { name: 'module', type: 'address', internalType: 'address' },
          { name: 'initData', type: 'bytes', internalType: 'bytes' }
        ]
      },
      {
        name: 'fallbacks',
        type: 'tuple[]',
        internalType: 'struct ModuleInit[]',
        components: [
          { name: 'module', type: 'address', internalType: 'address' },
          { name: 'initData', type: 'bytes', internalType: 'bytes' }
        ]
      },
      {
        name: 'hooks',
        type: 'tuple[]',
        internalType: 'struct ModuleInit[]',
        components: [
          { name: 'module', type: 'address', internalType: 'address' },
          { name: 'initData', type: 'bytes', internalType: 'bytes' }
        ]
      },
      {
        name: 'attesters',
        type: 'address[]',
        internalType: 'address[]'
      },
      { name: 'threshold', type: 'uint8', internalType: 'uint8' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

export const preValidationSetupAbi = [
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'initHash',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'preInit',
        type: 'bytes'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'preValidationSetup'
  }
] as const

export const predictSafeAddressAbi = [
  {
    type: 'function',
    name: 'predictSafeAddress',
    inputs: [
      {
        name: 'singleton',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'safeProxyFactory',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'creationCode',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'salt',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'factoryInitializer',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: 'safeProxy',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'pure'
  }
] as const

export const setupSafeAbi = [
  {
    type: 'function',
    name: 'setupSafe',
    inputs: [
      {
        name: 'initData',
        type: 'tuple',
        internalType: 'struct Safe7579Launchpad.InitData',
        components: [
          {
            name: 'singleton',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'owners',
            type: 'address[]',
            internalType: 'address[]'
          },
          {
            name: 'threshold',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'setupTo',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'setupData',
            type: 'bytes',
            internalType: 'bytes'
          },
          {
            name: 'safe7579',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'validators',
            type: 'tuple[]',
            internalType: 'struct ISafe7579Init.ModuleInit[]',
            components: [
              {
                name: 'module',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'initData',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'callData',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

export const hashAbi = [
  {
    type: 'function',
    name: 'hash',
    inputs: [
      {
        name: 'data',
        type: 'tuple',
        internalType: 'struct Safe7579Launchpad.InitData',
        components: [
          {
            name: 'singleton',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'owners',
            type: 'address[]',
            internalType: 'address[]'
          },
          {
            name: 'threshold',
            type: 'uint256',
            internalType: 'uint256'
          },
          { name: 'setupTo', type: 'address', internalType: 'address' },
          { name: 'setupData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'safe7579',
            type: 'address',
            internalType: 'contract ISafe7579'
          },
          {
            name: 'validators',
            type: 'tuple[]',
            internalType: 'struct ModuleInit[]',
            components: [
              {
                name: 'module',
                type: 'address',
                internalType: 'address'
              },
              { name: 'initData', type: 'bytes', internalType: 'bytes' }
            ]
          },
          { name: 'callData', type: 'bytes', internalType: 'bytes' }
        ]
      }
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'pure'
  }
] as const
