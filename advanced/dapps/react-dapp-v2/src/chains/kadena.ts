import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";
import { ChainRequestRender } from "@web-examples/shared";

// Re-export chain data and metadata from shared
export * from "@web-examples/shared/chains/kadena";

export function getChainRequestRender(
  request: JsonRpcRequest
): ChainRequestRender[] {
  return [
    { label: "Method", value: request.method },
    {
      label: "params",
      value: JSON.stringify(request.params, null, "\t"),
    },
  ];
}
