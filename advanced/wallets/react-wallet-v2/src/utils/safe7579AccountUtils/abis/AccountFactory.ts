export const createProxyWithNonceAbi = [
  {
    type: 'function',
    name: 'createProxyWithNonce',
    inputs: [
      {
        name: '_singleton',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'initializer',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'saltNonce',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: 'proxy',
        type: 'address',
        internalType: 'contract SafeProxy'
      }
    ],
    stateMutability: 'nonpayable'
  }
] as const

export const proxyCreationCodeAbi = [
  {
    type: 'function',
    name: 'proxyCreationCode',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    stateMutability: 'pure'
  }
] as const
