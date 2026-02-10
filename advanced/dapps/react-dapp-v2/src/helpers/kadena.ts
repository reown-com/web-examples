type KadenaNetworkId = "mainnet01" | "testnet04" | (string & {});
type KadenaChainId = `${number}`;

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
  WCNetworkId: KadenaNetworkId,
  kadenaChainID: KadenaChainId
): Promise<number> {
  const ENDPOINT = WCNetworkId === "testnet04" ? "testnet." : "";
  const API_HOST = `https://api.${ENDPOINT}chainweb.com/chainweb/0.0/${WCNetworkId}/chain/${kadenaChainID}/pact`;

  try {
    const cmd = JSON.stringify({
      code: `(coin.get-balance "k:${publicKey}")`,
      data: {},
    });

    const response = await fetch(`${API_HOST}/api/v1/local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd,
        hash: "",
        sigs: [],
      }),
    });

    const { result } = await response.json();
    if (result.status !== "success") return 0;

    return result.data * 10e17;
  } catch (e) {
    return 0;
  }
}

const kadenaNumberOfChains: Record<string, number> = {
  mainnet01: 0,
  testnet04: 0,
};

export async function apiGetKadenaAccountBalance(
  publicKey: string,
  WCNetworkId: KadenaNetworkId
) {
  if (!kadenaNumberOfChains[WCNetworkId]) {
    kadenaNumberOfChains[WCNetworkId] = await getKadenaChainAmount(WCNetworkId);
  }

  const chainBalances = await Promise.all(
    Array.from(Array(kadenaNumberOfChains[WCNetworkId])).map(
      async (_val, chainNumber) =>
        getKadenaBalanceForChain(
          publicKey,
          WCNetworkId,
          chainNumber.toString() as KadenaChainId
        )
    )
  );

  const totalBalance = chainBalances.reduce((acc, item) => acc + item, 0);

  return {
    balance: totalBalance.toString(),
    symbol: "KDA",
    name: "KDA",
  };
}
