import { Address, encodeFunctionData } from "viem"

export default class ERC20PaymasterLib {
    constructor() {}
    genereteApproveCallData = (erc20TokenAddress: Address, paymasterAddress: Address) => {
        const approveData = encodeFunctionData({
            abi: [
                {
                    inputs: [
                        { name: "_spender", type: "address" },
                        { name: "_value", type: "uint256" }
                    ],
                    name: "approve",
                    outputs: [{ name: "", type: "bool" }],
                    payable: false,
                    stateMutability: "nonpayable",
                    type: "function"
                }
            ],
            args: [paymasterAddress, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn]
        })
     
        // GENERATE THE CALLDATA TO APPROVE THE USDC
        const to = erc20TokenAddress
        const value = 0n
        const data = approveData
     
        const callData = encodeFunctionData({
            abi: [
                {
                    inputs: [
                        { name: "dest", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "func", type: "bytes" }
                    ],
                    name: "execute",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function"
                }
            ],
            args: [to, value, data]
        })
     
        return callData
    }
}