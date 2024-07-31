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
        name: 'signer',
        type: 'address',
        internalType: 'contract ISigner'
      },
      {
        name: 'signerInitData',
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
export const getDigestAbi = [
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
            name: 'signer',
            type: 'address',
            internalType: 'contract ISigner'
          },
          {
            name: 'signerInitData',
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
