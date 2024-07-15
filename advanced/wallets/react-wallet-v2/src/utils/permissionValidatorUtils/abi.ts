export const actionDataAbi = {
  components: [
    {
      internalType: 'bytes32',
      name: 'actionId',
      type: 'bytes32'
    },
    {
      components: [
        {
          internalType: 'address',
          name: 'policy',
          type: 'address'
        },
        {
          internalType: 'bytes',
          name: 'initData',
          type: 'bytes'
        }
      ],
      internalType: 'struct PolicyData[]',
      name: 'actionPolicies',
      type: 'tuple[]'
    }
  ],
  internalType: 'struct ActionData',
  name: 'actionData',
  type: 'tuple'
} as const
export const enableSessionAbi = [
  {
    name: 'data',
    type: 'tuple',
    internalType: 'struct EnableSessions',
    components: [
      {
        name: 'isigner',
        type: 'address',
        internalType: 'contract ISigner'
      },
      {
        name: 'isignerInitData',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'userOpPolicies',
        type: 'tuple[]',
        internalType: 'struct PolicyData[]',
        components: [
          {
            name: 'policy',
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
        name: 'erc1271Policies',
        type: 'tuple[]',
        internalType: 'struct PolicyData[]',
        components: [
          {
            name: 'policy',
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
        name: 'actions',
        type: 'tuple[]',
        internalType: 'struct ActionData[]',
        components: [
          {
            name: 'actionId',
            type: 'bytes32',
            internalType: 'ActionId'
          },
          {
            name: 'actionPolicies',
            type: 'tuple[]',
            internalType: 'struct PolicyData[]',
            components: [
              {
                name: 'policy',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'initData',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          }
        ]
      },
      {
        name: 'permissionEnableSig',
        type: 'bytes',
        internalType: 'bytes'
      }
    ]
  }
] as const
export const policyDataAbi = {
  components: [
    {
      internalType: 'address',
      name: 'policy',
      type: 'address'
    },
    {
      internalType: 'bytes',
      name: 'initData',
      type: 'bytes'
    }
  ],
  internalType: 'struct PolicyData',
  name: 'policyData',
  type: 'tuple'
} as const
export const smartSessionAbi = [
  {
    type: 'function',
    name: 'enableActionPolicies',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'actionPolicies',
        type: 'tuple[]',
        internalType: 'struct ActionData[]',
        components: [
          {
            name: 'actionId',
            type: 'bytes32',
            internalType: 'ActionId'
          },
          {
            name: 'actionPolicies',
            type: 'tuple[]',
            internalType: 'struct PolicyData[]',
            components: [
              {
                name: 'policy',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'initData',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'enableERC1271Policies',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'erc1271Policies',
        type: 'tuple[]',
        internalType: 'struct PolicyData[]',
        components: [
          {
            name: 'policy',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'initData',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'enableSessions',
    inputs: [
      {
        name: 'sessions',
        type: 'tuple[]',
        internalType: 'struct InstallSessions[]',
        components: [
          {
            name: 'signerId',
            type: 'bytes32',
            internalType: 'SignerId'
          },
          {
            name: 'userOpPolicies',
            type: 'tuple[]',
            internalType: 'struct PolicyData[]',
            components: [
              {
                name: 'policy',
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
            name: 'erc1271Policies',
            type: 'tuple[]',
            internalType: 'struct PolicyData[]',
            components: [
              {
                name: 'policy',
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
            name: 'actions',
            type: 'tuple[]',
            internalType: 'struct ActionData[]',
            components: [
              {
                name: 'actionId',
                type: 'bytes32',
                internalType: 'ActionId'
              },
              {
                name: 'actionPolicies',
                type: 'tuple[]',
                internalType: 'struct PolicyData[]',
                components: [
                  {
                    name: 'policy',
                    type: 'address',
                    internalType: 'address'
                  },
                  {
                    name: 'initData',
                    type: 'bytes',
                    internalType: 'bytes'
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'enableUserOpPolicies',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'userOpPolicies',
        type: 'tuple[]',
        internalType: 'struct PolicyData[]',
        components: [
          {
            name: 'policy',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'initData',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDigest',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'data',
        type: 'tuple',
        internalType: 'struct EnableSessions',
        components: [
          {
            name: 'isigner',
            type: 'address',
            internalType: 'contract ISigner'
          },
          {
            name: 'isignerInitData',
            type: 'bytes',
            internalType: 'bytes'
          },
          {
            name: 'userOpPolicies',
            type: 'tuple[]',
            internalType: 'struct PolicyData[]',
            components: [
              {
                name: 'policy',
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
            name: 'erc1271Policies',
            type: 'tuple[]',
            internalType: 'struct PolicyData[]',
            components: [
              {
                name: 'policy',
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
            name: 'actions',
            type: 'tuple[]',
            internalType: 'struct ActionData[]',
            components: [
              {
                name: 'actionId',
                type: 'bytes32',
                internalType: 'ActionId'
              },
              {
                name: 'actionPolicies',
                type: 'tuple[]',
                internalType: 'struct PolicyData[]',
                components: [
                  {
                    name: 'policy',
                    type: 'address',
                    internalType: 'address'
                  },
                  {
                    name: 'initData',
                    type: 'bytes',
                    internalType: 'bytes'
                  }
                ]
              }
            ]
          },
          {
            name: 'permissionEnableSig',
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
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isInitialized',
    inputs: [
      {
        name: 'smartAccount',
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
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isModuleType',
    inputs: [
      {
        name: 'typeID',
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
        name: 'signature',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: 'sigValidationResult',
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
    name: 'removeSession',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setSigner',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'signer',
        type: 'address',
        internalType: 'contract ISigner'
      },
      {
        name: 'initData',
        type: 'bytes',
        internalType: 'bytes'
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
        name: 'vd',
        type: 'uint256',
        internalType: 'ERC7579ValidatorBase.ValidationData'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'PolicyEnabled',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        indexed: false,
        internalType: 'SignerId'
      },
      {
        name: 'policy',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'smartAccount',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'SessionRemoved',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        indexed: false,
        internalType: 'SignerId'
      },
      {
        name: 'smartAccount',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
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
    name: 'InvalidEnableSignature',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'hash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidISigner',
    inputs: [
      {
        name: 'isigner',
        type: 'address',
        internalType: 'contract ISigner'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidSessionKeySignature',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'isigner',
        type: 'address',
        internalType: 'contract ISigner'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'userOpHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidUserOpSender',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'LinkedList_AlreadyInitialized',
    inputs: []
  },
  {
    type: 'error',
    name: 'LinkedList_EntryAlreadyInList',
    inputs: [
      {
        name: 'entry',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'LinkedList_InvalidEntry',
    inputs: [
      {
        name: 'entry',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'LinkedList_InvalidPage',
    inputs: []
  },
  {
    type: 'error',
    name: 'NoPoliciesSet',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
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
  },
  {
    type: 'error',
    name: 'PolicyViolation',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'policy',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'SignerNotFound',
    inputs: [
      {
        name: 'signerId',
        type: 'bytes32',
        internalType: 'SignerId'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'UnsupportedExecutionType',
    inputs: []
  },
  {
    type: 'error',
    name: 'UnsupportedPolicy',
    inputs: [
      {
        name: 'policy',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'UnsupportedSmartSessionMode',
    inputs: [
      {
        name: 'mode',
        type: 'uint8',
        internalType: 'enum SmartSessionMode'
      }
    ]
  }
] as const

export const WebAuthnValidationDataAbi = {
  components: [
    {
      internalType: 'uint256',
      name: 'pubKeyX',
      type: 'uint256'
    },
    {
      internalType: 'uint256',
      name: 'pubKeyY',
      type: 'uint256'
    }
  ],
  internalType: 'struct WebAuthnValidatorData',
  name: 'webAuthnValidatorData',
  type: 'tuple'
} as const
