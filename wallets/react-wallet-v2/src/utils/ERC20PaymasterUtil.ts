import { Address, Hex, encodeFunctionData } from "viem"

export const VITALIK_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as Hex
export const GOERLI_PAYMASTER_ADDRESS = '0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009'
export const GOERLI_USDC_ADDRESS = '0x07865c6e87b9f70255377e024ace6630c1eaa37f'

export const genereteDummyCallData = () => {
    // SEND EMPTY CALL TO VITALIK
    const to = VITALIK_ADDRESS
    const value = 0n
    const data = "0x"
 
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


export const genereteApproveCallData = (erc20TokenAddress: Address, paymasterAddress: Address) => {
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
			args: [paymasterAddress, 0xffffffffffffn]
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