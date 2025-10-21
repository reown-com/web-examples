import {
  Message,
  beginCell,
  storeMessage,
  Cell,
  loadMessage,
  Address,
} from "@ton/core";
import { TonClient, Transaction } from "@ton/ton";

let clients = new Map<string, TonClient>();
function getTonClient(chainId: string) {
  if (clients.has(chainId)) {
    return clients.get(chainId)!;
  }
  const client = new TonClient({
    endpoint: chainId?.includes("-3")
      ? "https://ton-testnet.api.onfinality.io/public"
      : "https://toncenter.com/api/v2/jsonRPC",
  });
  clients.set(chainId, client);
  return client;
}

export async function getTonTransactionHash({
  boc,
  address,
  chainId,
}: {
  boc: string;
  address: string;
  chainId: string;
}) {
  const client = getTonClient(chainId);
  const decodedTransfer = Cell.fromBase64(boc);

  // Build external-in message
  const message: Message = {
    info: {
      type: "external-in",
      src: null,
      dest: Address.parse(address),
      importFee: BigInt(0),
    },
    init: null,
    body: decodedTransfer,
  };

  const externalMessageCell = beginCell()
    .store(storeMessage(message, { forceRef: true }))
    .endCell();
  // Wait until the transaction with matching normalized incoming message appears
  const tx = await retry(
    async () => {
      const found = await getTransactionByInMessage(
        externalMessageCell.toBoc().toString("base64"),
        client
      );
      if (!found) throw new Error("Tx not found yet");
      return found;
    },
    { retries: 60, delay: 2000, progress: true, progressLabel: "findTx" }
  );
  if (!tx) {
    console.log("Transaction was not found");
    return "";
  }
  const txHashHex = tx.hash().toString("hex");
  console.log("Transaction found:", txHashHex);
  // Explorer link:
  console.log(
    "Transaction link: ",
    `https://testnet.tonviewer.com/transaction/${txHashHex}`
  );
  return txHashHex;
}

export function getNormalizedExtMessageHash(message: Message) {
  if (message.info.type !== "external-in") {
    throw new Error(`Message must be "external-in", got ${message.info.type}`);
  }
  const info = {
    ...message.info,
    src: undefined,
    importFee: BigInt(0),
  };
  const normalizedMessage = {
    ...message,
    init: null,
    info: info,
  };
  return beginCell()
    .store(storeMessage(normalizedMessage, { forceRef: true }))
    .endCell()
    .hash();
}

// Modified version of the retry function from the TON Connect example
async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries: number;
    delay: number;
    progress?: boolean;
    progressLabel?: string;
  }
): Promise<T> {
  let lastError: Error | undefined;
  let printedHeader = false;
  let printedAnything = false;
  for (let i = 0; i < options.retries; i++) {
    if (options.progress) {
      if (!printedHeader && options.progressLabel) {
        console.log(`${options.progressLabel}: `);
        printedHeader = true;
      }
      console.log(".");
      printedAnything = true;
    }
    try {
      const result = await fn();
      if (printedAnything) console.log("\n");
      return result;
    } catch (e) {
      if (e instanceof Error) lastError = e;
      if (i < options.retries - 1) {
      }
    }

    await new Promise((resolve) => setTimeout(resolve, options.delay));
  }
  if (printedAnything) console.log("\n");
  throw lastError;
}

async function getTransactionByInMessage(
  inMessageBoc: string,
  client: TonClient
): Promise<Transaction | undefined> {
  const inMessage = loadMessage(Cell.fromBase64(inMessageBoc).beginParse());
  if (inMessage.info.type !== "external-in") {
    throw new Error(
      `Message must be "external-in", got ${inMessage.info.type}`
    );
  }
  const account = inMessage.info.dest;
  const targetInMessageHash = getNormalizedExtMessageHash(inMessage);
  let lt: string | undefined = undefined;
  let hash: string | undefined = undefined;
  while (true) {
    const transactions = await retry(
      () =>
        client.getTransactions(account, {
          hash,
          lt,
          limit: 10,
          archival: true,
        }),
      { delay: 2000, retries: 3 }
    );
    if (transactions.length === 0) {
      return undefined;
    }
    for (const transaction of transactions) {
      if (transaction.inMessage?.info.type !== "external-in") {
        continue;
      }
      const inMessageHash = getNormalizedExtMessageHash(transaction.inMessage);
      if (
        inMessageHash.toString("hex") === targetInMessageHash.toString("hex")
      ) {
        return transaction;
      }
    }
    const last = transactions.at(-1)!;
    lt = last.lt.toString();
    hash = last.hash().toString("base64");
  }
}
