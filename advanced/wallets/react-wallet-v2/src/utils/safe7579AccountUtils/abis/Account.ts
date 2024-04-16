export const executeAbi = [{
  "type": "function",
  "name": "execute",
  "inputs": [
    {
      "name": "mode",
      "type": "bytes32",
      "internalType": "ModeCode"
    },
    {
      "name": "executionCalldata",
      "type": "bytes",
      "internalType": "bytes"
    }
  ],
  "outputs": [],
  "stateMutability": "payable"
}] as const