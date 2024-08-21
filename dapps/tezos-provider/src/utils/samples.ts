import {
    PartialTezosDelegationOperation,
    PartialTezosOriginationOperation as PartialTezosOriginationOperationOriginal,
    PartialTezosTransactionOperation,
    TezosBallotOperation,
    TezosOperationType, 
    TezosTransactionOperation}
    from "@airgap/beacon-types";

import { ScriptedContracts } from "@taquito/rpc";

interface PartialTezosOriginationOperation
  extends Omit<PartialTezosOriginationOperationOriginal, "script"> {
  script: ScriptedContracts;
}
  
export enum DEFAULT_TEZOS_METHODS {
  TEZOS_GET_ACCOUNTS = "tezos_getAccounts",
  TEZOS_SEND = "tezos_send",
  TEZOS_SEND_TRANSACTION = "tezos_send:transaction",
  TEZOS_SEND_ORGINATION = "tezos_send:origination",
  TEZOS_SEND_CONTRACT_CALL = "tezos_send:contract_call",
  TEZOS_SEND_DELEGATION = "tezos_send:delegation",
  TEZOS_SEND_UNDELEGATION = "tezos_send:undelegation",
  TEZOS_SEND_STAKE = "tezos_send:stake",
  TEZOS_SEND_UNSTAKE = "tezos_send:unstake",
  TEZOS_SEND_FINALIZE = "tezos_send:finalize",
  TEZOS_SEND_BALLOT = "tezos_send:ballot",
  TEZOS_SIGN = "tezos_sign",
}

const tezosTransactionOperation: PartialTezosTransactionOperation = {
  kind: TezosOperationType.TRANSACTION,
  destination: "tz3ZmB8oWUmi8YZXgeRpgAcPnEMD8VgUa4Ve", // Tezos Foundation Ghost Baker
  amount: "100000"
};

const tezosOriginationOperation: PartialTezosOriginationOperation = {
  kind: TezosOperationType.ORIGINATION,
  balance: '1',
  script: { // This contract adds the parameter to the storage value
    code: [
      { prim: "parameter", args: [{ prim: "int" }] },
      { prim: "storage", args: [{ prim: "int" }] },
      { prim: "code",
        args: [[
            { prim: "DUP" },                                // Duplicate the parameter (parameter is pushed onto the stack)
            { prim: "CAR" },                                // Access the parameter from the stack (parameter is on top)
            { prim: "DIP", args: [[{ prim: "CDR" }]] },     // Access the storage value (storage is on the stack)
            { prim: "ADD" },                                // Add the parameter to the storage value
            { prim: "NIL", args: [{ prim: "operation" }] }, // Create an empty list of operations
            { prim: "PAIR" }                                // Pair the updated storage with the empty list of operations
        ]]
      }
    ],
    storage: { int: "10" }
  },
};

const tezosContractCallOperation: PartialTezosTransactionOperation = {
  kind: TezosOperationType.TRANSACTION,
  destination: "[contract address]",
  amount: "0",
  parameters: { entrypoint: "default", value: { int: "20" } } // Add 20 to the current storage value
};

const tezosDelegationOperation: PartialTezosDelegationOperation = {
  kind: TezosOperationType.DELEGATION,
  delegate: "tz3ZmB8oWUmi8YZXgeRpgAcPnEMD8VgUa4Ve" // Tezos Foundation Ghost Baker. Cannot delegate to ourself as that would block undelegation
};

const tezosUndelegationOperation: PartialTezosDelegationOperation = {
  kind: TezosOperationType.DELEGATION
};

const tezosStakeOperation: PartialTezosTransactionOperation = {
  kind: TezosOperationType.TRANSACTION,
  destination:"[own adress]",
  amount: "1000000",
  parameters: {
    entrypoint: "stake",
    value: { prim: "Unit" },
  },
};

const tezosUnstakeOperation: PartialTezosTransactionOperation = {
  kind: TezosOperationType.TRANSACTION,
  destination:"[own adress]",
  amount: "1000000",
  parameters: {
    entrypoint: "unstake",
    value: { prim: "Unit" },
  },
};

const tezosFinalizeOperation: PartialTezosTransactionOperation = {
  kind: TezosOperationType.TRANSACTION,
  destination:"[own adress]",
  amount: "0",
  parameters: {
    entrypoint: "finalize_unstake",
    value: { prim: "Unit" },
  },
};

const tezosBallotOperation: TezosBallotOperation = {
  kind: TezosOperationType.BALLOT,
  source: "tz3ZmB8oWUmi8YZXgeRpgAcPnEMD8VgUa4Ve", // Tezos Foundation Ghost Baker
  period: "0",
  proposal: "[current proposal]",
  ballot: "yay"
};

// Assign the specific types to the TEZOS_ACTIONS object
export const TEZOS_ACTIONS = {
  "tezos_send:transaction": tezosTransactionOperation,
  "tezos_send:origination": tezosOriginationOperation,
  "tezos_send:contract_call": tezosContractCallOperation,
  "tezos_send:delegation": tezosDelegationOperation,
  "tezos_send:undelegation": tezosUndelegationOperation,
  "tezos_send:stake": tezosStakeOperation,
  "tezos_send:unstake": tezosUnstakeOperation,
  "tezos_send:finalize": tezosFinalizeOperation,
  "tezos_send:ballot": tezosBallotOperation,
};

export enum DEFAULT_TEZOS_EVENTS {}
