import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";
import { getChainMetadata, ChainRequestRender } from "@web-examples/shared";
export { getChainMetadata };
import * as eip155 from "./eip155";
import * as cosmos from "./cosmos";
import * as polkadot from "./polkadot";
import * as near from "./near";
import * as tezos from "./tezos";
import * as kadena from "./kadena";

export function getChainRequestRender(
  request: JsonRpcRequest,
  chainId: string
): ChainRequestRender[] {
  const namespace = chainId.split(":")[0];
  switch (namespace) {
    case "eip155":
      return eip155.getChainRequestRender(request);
    case "cosmos":
      return cosmos.getChainRequestRender(request);
    case "polkadot":
      return polkadot.getChainRequestRender(request);
    case "near":
      return near.getChainRequestRender(request);
    case "tezos":
      return tezos.getChainRequestRender(request);
    case "kadena":
      return kadena.getChainRequestRender(request);
    default:
      throw new Error(`No render handler for namespace ${namespace}`);
  }
}
