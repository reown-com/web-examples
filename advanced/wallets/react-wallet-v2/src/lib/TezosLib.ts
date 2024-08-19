import { OpKind, ParamsWithKind, TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer'

import { Wallet } from 'ethers/'
import { PvmKind, ScriptedContracts } from '@taquito/rpc';
import { PartialTezosOperation, TezosOperationType } from '@airgap/beacon-types'

/**
 * Constants
 */
const DEFAULT_PATH = "m/44'/1729'/0'/0'"
const DEFAULT_CURVE = 'ed25519'

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
  path?: string
  curve?: 'ed25519' | 'secp256k1'
}

/**
 * Library
 */
export default class TezosLib {
  tezos: TezosToolkit
  signer: InMemorySigner
  mnemonic: string
  secretKey: string
  publicKey: string
  address: string
  curve: 'ed25519' | 'secp256k1'

  constructor(
    tezos: TezosToolkit,
    mnemonic: string,
    signer: InMemorySigner,
    secretKey: string,
    publicKey: string,
    address: string,
    curve: 'ed25519' | 'secp256k1'
  ) {
    this.tezos = tezos
    this.mnemonic = mnemonic
    this.signer = signer
    this.secretKey = secretKey
    this.publicKey = publicKey
    this.address = address
    this.curve = curve
  }

  static async init({ mnemonic, path, curve }: IInitArguments) {
    const params = {
      mnemonic: mnemonic ?? Wallet.createRandom().mnemonic.phrase,
      derivationPath: path ?? DEFAULT_PATH,
      curve: curve ?? DEFAULT_CURVE
    }

    // TODO: https://github.com/trilitech/web-examples/issues/2
    // Hardcoded Tezos to use testnet
    // Tezos should be able to switch between testnets and mainnet
    const Tezos = new TezosToolkit('https://rpc.ghostnet.teztnets.com')

    const signer = InMemorySigner.fromMnemonic(params)

    Tezos.setSignerProvider(signer)

    const secretKey = await signer.secretKey()
    const publicKey = await signer.publicKey()
    const address = await signer.publicKeyHash()

    return new TezosLib(Tezos, params.mnemonic, signer, secretKey, publicKey, address, params.curve)
  }

  public getMnemonic() {
    return this.mnemonic
  }

  public getPublicKey() {
    return this.publicKey
  }

  public getCurve() {
    return this.curve
  }

  public getAddress() {
    return this.address
  }

  public convertToPartialParamsWithKind(op: PartialTezosOperation): ParamsWithKind {
    switch (op.kind) {
      case TezosOperationType.ACTIVATE_ACCOUNT:
        return {
          kind: OpKind.ACTIVATION,
          pkh: op.pkh,
          secret: op.secret,
        };
      case TezosOperationType.DELEGATION:
        return {
          kind: OpKind.DELEGATION,
          source: op.source ?? "source not provided",
          delegate: op.delegate,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
        };
      case TezosOperationType.FAILING_NOOP:
        return {
          kind: OpKind.FAILING_NOOP,
          arbitrary: op.arbitrary,
          basedOnBlock: 'head',
        };
      case TezosOperationType.INCREASE_PAID_STORAGE:
        return {
          kind: OpKind.INCREASE_PAID_STORAGE,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          amount: Number(op.amount),
          destination: op.destination,
        };
      case TezosOperationType.ORIGINATION:
        let script : ScriptedContracts = op.script as unknown as ScriptedContracts;
        return {
          kind: OpKind.ORIGINATION,
          balance: Number(op.balance),
          code: script.code,
          init: script.storage,
          delegate: op.delegate,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
        };
      case TezosOperationType.REGISTER_GLOBAL_CONSTANT:
        return {
          kind: OpKind.REGISTER_GLOBAL_CONSTANT,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          value: op.value,
        };
      case TezosOperationType.SMART_ROLLUP_ADD_MESSAGES:
        return {
          kind: OpKind.SMART_ROLLUP_ADD_MESSAGES,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          message: op.message,
        };
      case TezosOperationType.SMART_ROLLUP_ORIGINATE:
        if (!(op.pvm_kind in PvmKind)) {
          throw new Error(`Invalid PvmKind: ${op.pvm_kind}`);
        }
        return {
          kind: OpKind.SMART_ROLLUP_ORIGINATE,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          pvmKind: op.pvm_kind,
          kernel: op.kernel,
          parametersType: op.parameters_ty,
        };
      case TezosOperationType.SMART_ROLLUP_EXECUTE_OUTBOX_MESSAGE:
        return {
          kind: OpKind.SMART_ROLLUP_EXECUTE_OUTBOX_MESSAGE,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          rollup: op.rollup,
          cementedCommitment: op.cemented_commitment,
          outputProof: op.output_proof,
        };
      case TezosOperationType.TRANSACTION:
        return {
          kind: OpKind.TRANSACTION,
          to: op.destination,
          amount: Number(op.amount),
          mutez: true,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          parameter: op.parameters,
        };
      case TezosOperationType.TRANSFER_TICKET:
        return {
          kind: OpKind.TRANSFER_TICKET,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          ticketContents: op.ticket_contents,
          ticketTy: op.ticket_ty,
          ticketTicketer: op.ticket_ticketer,
          ticketAmount: Number(op.ticket_amount),
          destination: op.destination,
          entrypoint: op.entrypoint,
        };
      case TezosOperationType.UPDATE_CONSENSUS_KEY:
        return {
          kind: OpKind.UPDATE_CONSENSUS_KEY,
          source: op.source,
          fee: op.fee ? Number(op.fee) : undefined,
          gasLimit: op.gas_limit ? Number(op.gas_limit) : undefined,
          storageLimit: op.storage_limit ? Number(op.storage_limit) : undefined,
          pk: op.pk,
        };
      default:
        throw new Error(`Operation kind cannot be converted to ParamsWithKind: ${op.kind}`);
    }
  }
  

  public async signTransaction(transaction: any) {
    // Map the transactions and prepare the batch
    console.log(`Wallet: handling transaction: `, transaction);
    const batchTransactions: ParamsWithKind[] = transaction.map((tx: PartialTezosOperation) => {
      if (tx.kind === TezosOperationType.DELEGATION && !tx.source) {
        tx.source = this.address;
      }
      const op: ParamsWithKind = this.convertToPartialParamsWithKind(tx);
      return op;
    });

    // Prepare the batch
    console.log(`Wallet: prepared batchTransactions `, batchTransactions);
    const batch = this.tezos.contract.batch(batchTransactions);

    // Send the batch and wait for the operation hash
    console.log(`Wallet: sending batch `, batch);
    const operation = await batch.send();

    // Wait for confirmation
    await operation.confirmation();

    console.log('Wallet: operation confirmed:', operation);
    return operation.hash;
  }

  public async signPayload(payload: any) {
    return await this.signer.sign(payload)
  }
}
