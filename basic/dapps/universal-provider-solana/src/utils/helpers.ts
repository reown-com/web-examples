import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import UniversalProvider from "@walletconnect/universal-provider/dist/types/UniversalProvider";
import bs58 from "bs58";
import nacl from "tweetnacl";

export enum SolanaChains {
  MainnetBeta = "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
  Devnet = "8E9rvCKLFQia2Y35HXjjpWzj8weVo44K",
}

export function verifyTransactionSignature(
  address: string,
  signature: string,
  tx: Transaction
) {
  return nacl.sign.detached.verify(
    tx.serializeMessage(),
    bs58.decode(signature),
    bs58.decode(address)
  );
}

export function verifyMessageSignature(
  address: string,
  signature: string,
  message: string
) {
  return nacl.sign.detached.verify(
    bs58.decode(message),
    bs58.decode(signature),
    bs58.decode(address)
  );
}

const isVersionedTransaction = (
  transaction: Transaction | VersionedTransaction
): transaction is VersionedTransaction => "version" in transaction;


export const getProviderUrl = (chainId: string) => {
  return `https://rpc.walletconnect.com/v1/?chainId=${chainId}&projectId=${
    import.meta.env.VITE_PROJECT_ID
  }`;
};

export const signMessage = async (
  msg: string,
  provider: UniversalProvider,
  address: string
) => {
  const senderPublicKey = new PublicKey(address);

  const message = bs58.encode(new TextEncoder().encode(msg));

  try {
    const result = await provider!.request<{ signature: string }>({
      method: "solana_signMessage",
      params: {
        pubkey: senderPublicKey.toBase58(),
        message,
      },
    });

    const valid = verifyMessageSignature(
      senderPublicKey.toBase58(),
      result.signature,
      message
    );

    return {
      method: "solana_signMessage",
      address,
      valid,
      result: result.signature,
    };
    //eslint-disable-next-line
  } catch (error: any) {
    throw new Error(error);
  }
};

export const sendTransaction = async (
  to: string,
  amount: number,
  provider: UniversalProvider,
  address: string
) => {
  const isTestnet = provider.session!.namespaces.solana.chains?.includes(
    `solana:${SolanaChains.Devnet}`
  );

  const senderPublicKey = new PublicKey(address);

  const connection = new Connection(
    isTestnet
      ? clusterApiUrl("testnet")
      : getProviderUrl(`solana:${SolanaChains.MainnetBeta}`)
  );

  const { blockhash } = await connection.getLatestBlockhash();

  const transaction:Transaction | VersionedTransaction = new Transaction({
    feePayer: senderPublicKey,
    recentBlockhash: blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: new PublicKey(to),
      lamports: amount,
    })
  );

  let rawTransaction: string;
      let legacyTransaction: Transaction | VersionedTransaction | undefined;

      if (isVersionedTransaction(transaction)) {
        // V0 transactions are serialized and passed in the `transaction` property
        rawTransaction = Buffer.from(transaction.serialize()).toString(
          "base64"
        );

        if (transaction.version === "legacy") {
          // For backwards-compatible, legacy transactions are spread in the params
          legacyTransaction = Transaction.from(transaction.serialize());
        }
      } else {
        rawTransaction = transaction
          .serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
          .toString("base64");
        legacyTransaction = transaction;
      }

  try {
    const result = await provider!.request<{ signature: string }>({
      method: "solana_signTransaction",
      params: {
        // Passing ...legacyTransaction is deprecated.
        // All new clients should rely on the `transaction` parameter.
        // The future versions will stop passing ...legacyTransaction.
        ...legacyTransaction,
        // New base64-encoded serialized transaction request parameter
        transaction: rawTransaction,
      },
    });

    // We only need `Buffer.from` here to satisfy the `Buffer` param type for `addSignature`.
    // The resulting `UInt8Array` is equivalent to just `bs58.decode(...)`.
    transaction.addSignature(
      senderPublicKey,
      Buffer.from(bs58.decode(result.signature))
    );

    const valid = transaction.verifySignatures();

    return {
      method: "solana_signTransaction",
      address,
      valid,
      result: result.signature,
    };
    // eslint-disable-next-line
  } catch (error: any) {
    throw new Error(error);
  }
};
