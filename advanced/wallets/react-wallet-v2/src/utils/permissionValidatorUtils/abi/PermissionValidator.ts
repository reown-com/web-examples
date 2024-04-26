export const permissionValidatorAbi = [
  {
    type: 'function',
    name: '_parsePermissionFromPermissionEnableData',
    inputs: [
      {
        name: '_permissionEnableData',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: '_permissionIndex',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: 'permissionChainId',
        type: 'uint64',
        internalType: 'uint64'
      },
      {
        name: 'permissionDigest',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'checkPermissionForSmartAccount',
    inputs: [
      {
        name: 'smartAccount',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'permissionDataFromContext',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: 'permissionPrefix',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'enabledPermissions',
    inputs: [
      {
        name: 'singleSignerPermissionId',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'smartAccount',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: 'validUntil',
        type: 'uint48',
        internalType: 'ValidUntil'
      },
      {
        name: 'validAfter',
        type: 'uint48',
        internalType: 'ValidAfter'
      },
      {
        name: 'signatureValidationAlgorithm',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'signer',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'policy',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'policyData',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getModuleTypes',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getPermissionId',
    inputs: [
      {
        name: 'permission',
        type: 'tuple',
        internalType: 'struct SingleSignerPermission',
        components: [
          {
            name: 'validUntil',
            type: 'uint48',
            internalType: 'ValidUntil'
          },
          {
            name: 'validAfter',
            type: 'uint48',
            internalType: 'ValidAfter'
          },
          {
            name: 'signatureValidationAlgorithm',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'signer',
            type: 'bytes',
            internalType: 'bytes'
          },
          {
            name: 'policy',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'policyData',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'getPermissionIdFromUnpacked',
    inputs: [
      {
        name: 'validUntil',
        type: 'uint48',
        internalType: 'ValidUntil'
      },
      {
        name: 'validAfter',
        type: 'uint48',
        internalType: 'ValidAfter'
      },
      {
        name: 'signatureValidationAlgorithm',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'signer',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'policy',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'policyData',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'isInitialized',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'isModuleType',
    inputs: [
      {
        name: 'moduleTypeId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'isValidSignatureWithSender',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'hash',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bytes4',
        internalType: 'bytes4'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'onInstall',
    inputs: [
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'onUninstall',
    inputs: [
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'test',
    inputs: [
      {
        name: 'a',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'validateUserOp',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          {
            name: 'sender',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'nonce',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'initCode',
            type: 'bytes',
            internalType: 'bytes'
          },
          {
            name: 'callData',
            type: 'bytes',
            internalType: 'bytes'
          },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32'
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'gasFees',
            type: 'bytes32',
            internalType: 'bytes32'
          },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes'
          },
          {
            name: 'signature',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'userOpHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: 'validationData',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'error',
    name: 'AlreadyInitialized',
    inputs: [
      {
        name: 'smartAccount',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidTargetAddress',
    inputs: [
      {
        name: 'target',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'NotInitialized',
    inputs: [
      {
        name: 'smartAccount',
        type: 'address',
        internalType: 'address'
      }
    ]
  }
] as const
