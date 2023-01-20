import { PactCommand } from "@kadena/client";

export async function getKadenaChainAmount(
  WCNetworkId: string
): Promise<number> {
  const ENDPOINT = WCNetworkId === "testnet04" ? "testnet." : "";

  try {
    const response = await fetch(`https://api.${ENDPOINT}chainweb.com/info`, {
      mode: "cors",
    });

    const json = await response.json();
    return json.nodeNumberOfChains;
  } catch (e) {
    console.error("Error fetching Kadena chain info", e);
    return 0;
  }
}

async function getKadenaBalanceForChain(
  publicKey: string,
  WCNetworkId: string,
  kadenaChainID: string
): Promise<number> {
  const ENDPOINT = WCNetworkId === "testnet04" ? "testnet." : "";
  const API_HOST = `https://api.${ENDPOINT}chainweb.com/chainweb/0.0/${WCNetworkId}/chain/${kadenaChainID}/pact`;

  // This request will fail if there is no on-chain activity for the given account yet
  const command = new PactCommand();
  command.code = `(coin.get-balance "k:${publicKey}")`;
  const { result } = await command.local(API_HOST);

  if (result.status !== "success") return 0;

  return result.data as number;
}

const kadenaNumberOfChains: Record<string, number> = {
  mainnet01: 0,
  testnet04: 0,
};

export async function apiGetKadenaAccountBalance(
  publicKey: string,
  WCNetworkId: string
) {
  if (!kadenaNumberOfChains[WCNetworkId]) {
    kadenaNumberOfChains[WCNetworkId] = await getKadenaChainAmount(WCNetworkId);
  }
  const chainBalances = await Promise.all(
    Array.from(Array(kadenaNumberOfChains[WCNetworkId])).map(
      async (_val, chainNumber) =>
        getKadenaBalanceForChain(publicKey, WCNetworkId, chainNumber.toString())
    )
  );

  const totalBalance = chainBalances.reduce((acc, item) => acc + item, 0);

  return {
    balance: (totalBalance * 10e11).toString(),
    symbol: "KDA",
    name: "KDA",
  };
}
