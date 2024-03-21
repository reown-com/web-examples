/**
 * The exeuctor abi, used to execute transactions on the Biconomy ERC7579 Modular Smart Account
 */
export const BiconomyExecuteAbi = [
    {
        inputs: [
            {
                internalType: "ModeCode",
                name: "mode",
                type: "bytes32"
            },
            {
                internalType: "bytes",
                name: "executionCalldata",
                type: "bytes"
            }
        ],
        name: "execute",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    }
] as const

/**
 * The init abi, used to initialise Biconomy Modular Smart Account / setup default ECDSA module
 */
export const BiconomyInitAbi = [] as const
