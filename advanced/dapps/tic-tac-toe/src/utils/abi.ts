export const ticTacToeAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_playerO",
        type: "address",
      },
    ],
    name: "createGame",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "playerX",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "playerO",
        type: "address",
      },
    ],
    name: "GameCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "winner",
        type: "address",
      },
    ],
    name: "GameEnded",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "position",
        type: "uint8",
      },
    ],
    name: "makeMove",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "position",
        type: "uint8",
      },
    ],
    name: "MoveMade",
    type: "event",
  },
  {
    inputs: [],
    name: "gameCounter",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "games",
    outputs: [
      {
        internalType: "address",
        name: "playerX",
        type: "address",
      },
      {
        internalType: "address",
        name: "playerO",
        type: "address",
      },
      {
        internalType: "address",
        name: "currentPlayer",
        type: "address",
      },
      {
        internalType: "address",
        name: "winner",
        type: "address",
      },
      {
        internalType: "bool",
        name: "gameStarted",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "movesCount",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
    ],
    name: "getBoard",
    outputs: [
      {
        internalType: "uint8[9]",
        name: "",
        type: "uint8[9]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
