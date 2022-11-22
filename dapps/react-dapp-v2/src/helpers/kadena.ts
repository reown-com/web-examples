// @ts-expect-error Could not find a declaration file for module 'pact-lang-api'
import Pact from "pact-lang-api";

export async function getKadenaChainAmount(
  allNamespaceAccounts: any
): Promise<number> {
  const isTestnet = allNamespaceAccounts.some((account: string) => {
    const [namespace, WCNetworkId] = account.split(":");
    return namespace === "kadena" && WCNetworkId === "testnet04";
  });

  const ENDPOINT = isTestnet === "testnet04" ? "testnet." : "";

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
) {
  const ENDPOINT = WCNetworkId === "testnet04" ? "testnet." : "";
  const API_HOST = `https://api.${ENDPOINT}chainweb.com/chainweb/0.0/${WCNetworkId}/chain/${kadenaChainID}/pact`;

  const cmd = {
    networkId: WCNetworkId,
    keyPairs: [],
    pactCode: `(coin.get-balance "k:e82af4daa502ca3b039e48b892c7c21acb2dfa11ffc6c6581d4fbc044d244ea8")`, //@TODO
    envData: {},
    meta: {
      creationTime: Math.round(new Date().getTime() / 1000),
      ttl: 28000,
      gasLimit: 600,
      chainId: kadenaChainID,
      gasPrice: 0.0000001,
      sender: publicKey,
    },
  };

  const { result } = await Pact.fetch.local(cmd, API_HOST);

  if (result.data) return result.data;

  return 0;
}

export async function apiGetKadenaAccountBalance(
  publicKey: string,
  WCNetworkId: string,
  numberOfChains: number
) {
  const chainBalances = await Promise.all(
    Array.from(Array(numberOfChains)).map(async (_val, chainNumber) => {
      return getKadenaBalanceForChain(
        publicKey,
        WCNetworkId,
        chainNumber.toString()
      );
    })
  );

  const totalBalance = chainBalances.reduce((acc, item) => acc + item, 0);

  return {
    balance: (totalBalance * 10e11).toString(),
    symbol: "KDA",
    name: "KDA",
  };
}
