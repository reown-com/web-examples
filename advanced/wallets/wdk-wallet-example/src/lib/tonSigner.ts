/**
 * TON request signing, bridged onto the key pair WDK derives.
 *
 * WDK's high-level TON API only exposes a single-message `sendTransaction` and
 * no `signData`, so to fully serve the WalletConnect/TON-Connect methods
 * (`ton_sendMessage`, `ton_signData`) we drive a v5r1 wallet directly with the
 * raw key. We use the SAME wallet version (WalletContractV5R1) WDK uses, so the
 * address matches the one we advertise during session approval.
 */
import { KeyPair, sign, signVerify } from "@ton/crypto";
import {
  Address,
  Cell,
  Message,
  SendMode,
  TonClient,
  WalletContractV5R1,
  beginCell,
  internal,
  loadStateInit,
  storeMessage,
} from "@ton/ton";
import { sha256 } from "@noble/hashes/sha2";
import crc32 from "crc-32";
import { TON_CHAINS } from "@/config/chains";

export class TonValidationError extends Error {
  constructor(message: string) {
    super(`TonValidationError: ${message}`);
  }
}

async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1200,
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error("Retry attempts exhausted");
}

export class TonSigner {
  private keypair: KeyPair;
  private wallet: WalletContractV5R1;

  constructor(keypair: KeyPair) {
    this.keypair = keypair;
    this.wallet = WalletContractV5R1.create({
      workchain: 0,
      publicKey: keypair.publicKey,
    });
  }

  /** WDK exposes a 32-byte public key and the 64-byte secret key. */
  static fromWdkKeyPair(kp: {
    publicKey: Uint8Array;
    privateKey: Uint8Array | null;
  }) {
    if (!kp.privateKey) throw new Error("TON private key is unavailable");
    return new TonSigner({
      publicKey: Buffer.from(kp.publicKey),
      secretKey: Buffer.from(kp.privateKey),
    });
  }

  getAddressRaw() {
    return this.wallet.address.toRawString();
  }

  getPublicKey() {
    return this.keypair.publicKey.toString("hex");
  }

  private getTonClient(caip2: string): TonClient {
    const rpc = TON_CHAINS[caip2]?.rpc;
    if (!rpc) throw new Error(`No RPC configured for ${caip2}`);
    return new TonClient({ endpoint: rpc });
  }

  /** TON uses 32-bit (seconds) timestamps; some dApps send milliseconds. */
  private normalizeValidUntil(validUntil?: number): number | undefined {
    if (validUntil === undefined) return undefined;
    return validUntil > 10_000_000_000
      ? Math.floor(validUntil / 1000)
      : validUntil;
  }

  validateSendMessage(params: any) {
    if (typeof params !== "object" || params === null) {
      throw new TonValidationError("Invalid params");
    }
    if (!Array.isArray(params.messages) || params.messages.length === 0) {
      throw new TonValidationError("Messages are absent or empty");
    }
    for (const message of params.messages) {
      if (typeof message?.address !== "string") {
        throw new TonValidationError("Message address must be a string");
      }
      if (
        Address.isRaw(message.address) ||
        !Address.isFriendly(message.address)
      ) {
        throw new TonValidationError("Message address is invalid");
      }
      if (typeof message.amount !== "string") {
        throw new TonValidationError(
          "Message amount must be a string (nanotons)",
        );
      }
      BigInt(message.amount);
    }
  }

  private parseMessages(params: TonSendMessageParams) {
    return params.messages.map((message) =>
      internal({
        to: Address.parse(message.address),
        bounce: Address.parseFriendly(message.address).isBounceable,
        value: BigInt(message.amount),
        body: message.payload
          ? Cell.fromBase64(message.payload)
          : "WalletConnect transfer",
        init: message.stateInit
          ? loadStateInit(Cell.fromBase64(message.stateInit).beginParse())
          : undefined,
      }),
    );
  }

  /** ton_sendMessage — signs, broadcasts and returns the external message BoC (base64). */
  async sendMessage(
    params: TonSendMessageParams,
    caip2: string,
  ): Promise<string> {
    this.validateSendMessage(params);

    const client = this.getTonClient(caip2);
    const contract = client.open(this.wallet);
    const seqno = await retry(() => contract.getSeqno());

    const transfer = contract.createTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages: this.parseMessages(params),
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      timeout: this.normalizeValidUntil(params.valid_until),
    });

    await retry(() => contract.send(transfer));

    const externalMessage: Message = {
      info: {
        type: "external-in",
        src: null,
        dest: this.wallet.address,
        importFee: BigInt(0),
      },
      init: null,
      body: transfer,
    };

    return beginCell()
      .store(storeMessage(externalMessage, { forceRef: true }))
      .endCell()
      .toBoc()
      .toString("base64");
  }

  /** ton_signData — TON-Connect sign-data scheme (text / binary / cell). */
  async signData(
    params: TonSignDataParams,
    domain: string,
    caip2: string,
  ): Promise<TonSignDataResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = this.getToSign(params, domain, timestamp);
    const signature = sign(Buffer.from(toSign), this.keypair.secretKey);

    try {
      const verified = signVerify(
        Buffer.from(toSign),
        signature,
        this.keypair.publicKey,
      );
      console.log("TON signData verified:", verified);
    } catch (e) {
      console.warn("TON signData verification failed to run", e);
    }

    return {
      signature: signature.toString("base64"),
      address: this.getAddressRaw(),
      publicKey: this.getPublicKey(),
      timestamp,
      domain,
      payload: { ...params, network: caip2.split(":")[1] },
    };
  }

  private getToSign(
    params: TonSignDataParams,
    domain: string,
    timestamp: number,
  ): Uint8Array {
    if (params.type === "text" || params.type === "binary") {
      return this.createTextBinaryHash(
        params,
        this.wallet.address,
        domain,
        timestamp,
      );
    }
    if (params.type === "cell") {
      return this.createCellHash(
        params,
        this.wallet.address,
        domain,
        timestamp,
      );
    }
    throw new Error("Unsupported sign data type");
  }

  private createTextBinaryHash(
    payload: { type: "text"; text: string } | { type: "binary"; bytes: string },
    address: Address,
    domain: string,
    timestamp: number,
  ): Uint8Array {
    const enc = new TextEncoder();
    const wc = writeInt32BE(address.workChain);
    const domainBytes = enc.encode(domain);
    const domainLen = writeUint32BE(domainBytes.length);
    const ts = writeBigUint64BE(BigInt(timestamp));

    const content = payload.type === "text" ? payload.text : payload.bytes;
    const payloadPrefix = enc.encode(payload.type === "text" ? "txt" : "bin");
    const payloadBytes =
      payload.type === "text"
        ? enc.encode(content)
        : Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
    const payloadLen = writeUint32BE(payloadBytes.length);

    const message = concatBytes(
      new Uint8Array([0xff, 0xff]),
      enc.encode("ton-connect/sign-data/"),
      wc,
      new Uint8Array(address.hash),
      domainLen,
      domainBytes,
      ts,
      payloadPrefix,
      payloadLen,
      payloadBytes,
    );

    return sha256(message);
  }

  private createCellHash(
    payload: { type: "cell"; schema: string; cell: string },
    address: Address,
    domain: string,
    timestamp: number,
  ): Uint8Array {
    const cell = Cell.fromBase64(payload.cell);
    const schemaHash =
      crc32.buf(new TextEncoder().encode(payload.schema)) >>> 0;
    const encodedDomain = encodeDomainDnsLike(domain);

    const message = beginCell()
      .storeUint(0x75569022, 32)
      .storeUint(schemaHash, 32)
      .storeUint(timestamp, 64)
      .storeAddress(address)
      .storeStringRefTail(new TextDecoder().decode(encodedDomain))
      .storeRef(cell)
      .endCell();

    return new Uint8Array(message.hash());
  }
}

function encodeDomainDnsLike(domain: string): Uint8Array {
  const parts = domain.split(".").reverse();
  const encoded: number[] = [];
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) encoded.push(part.charCodeAt(i));
    encoded.push(0);
  }
  return new Uint8Array(encoded);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function writeUint32BE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, false);
  return buf;
}

function writeInt32BE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setInt32(0, value, false);
  return buf;
}

function writeBigUint64BE(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, value, false);
  return buf;
}

export interface TonSendMessageParams {
  valid_until?: number;
  from?: string;
  messages: Array<{
    address: string;
    amount: string;
    payload?: string;
    stateInit?: string;
  }>;
}

export type TonSignDataParams =
  | { type: "text"; text: string; from?: string }
  | { type: "binary"; bytes: string; from?: string }
  | { type: "cell"; schema: string; cell: string; from?: string };

export interface TonSignDataResult {
  signature: string;
  address: string;
  publicKey: string;
  timestamp: number;
  domain: string;
  payload: unknown;
}
