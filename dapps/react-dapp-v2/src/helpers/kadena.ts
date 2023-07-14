import { IPactCommand, PactCommand } from "@kadena/client";

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
  WCNetworkId: IPactCommand["networkId"],
  kadenaChainID: IPactCommand["publicMeta"]["chainId"]
): Promise<number> {
  const ENDPOINT = WCNetworkId === "testnet04" ? "testnet." : "";
  const API_HOST = `https://api.${ENDPOINT}chainweb.com/chainweb/0.0/${WCNetworkId}/chain/${kadenaChainID}/pact`;

  // This request will fail if there is no on-chain activity for the given account yet
  try {
    const command = new PactCommand();
    command.code = `(coin.get-balance "k:${publicKey}")`;
    command.setMeta(
      { sender: `k:${publicKey}`, chainId: kadenaChainID },
      WCNetworkId
    );
    const { result } = await command.local(API_HOST, {
      preflight: false,
      signatureVerification: false,
    });

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
  WCNetworkId: IPactCommand["networkId"]
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
          chainNumber.toString() as IPactCommand["publicMeta"]["chainId"]
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
