import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) throw new Error('Project ID is not defined')

export const config = defaultWagmiConfig({
  projectId,
  chains: [mainnet, sepolia],
  metadata: {
    name: 'My App',
    description: 'My app description',
    url: 'https://myapp.com',
    icons: ['https://myapp.com/favicon.ico'],
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
})

export const ContractAddress = '0xfeBf9cFFC36A4ADB62361FC4158E790da4304eEa'
export const ABI = [
  {
    inputs: [
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'createData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_id',
        type: 'uint256',
      },
    ],
    name: 'deleteData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_id',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'updateData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_id',
        type: 'uint256',
      },
    ],
    name: 'readData',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
