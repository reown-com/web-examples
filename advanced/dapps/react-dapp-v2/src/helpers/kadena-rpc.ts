interface KadenaTransferParams {
  senderAccount: string;
  senderPublicKey: string;
  receiverAccount: string;
  amount: string;
  chainId: string;
  networkId: string;
}

function buildPactCommand(params: KadenaTransferParams) {
  const creationTime = Math.floor(Date.now() / 1000);
  const nonce = `wc-test-${creationTime}`;

  const cmd = {
    payload: {
      exec: {
        data: {},
        code: `(coin.transfer "${params.senderAccount}" "${params.receiverAccount}" ${params.amount}.0)`,
      },
    },
    meta: {
      chainId: params.chainId,
      gasLimit: 1000,
      gasPrice: 1.0e-6,
      ttl: 600,
      sender: params.senderAccount,
      creationTime,
    },
    networkId: params.networkId,
    nonce,
    signers: [
      {
        pubKey: params.senderPublicKey,
        clist: [
          { name: "coin.GAS", args: [] },
          {
            name: "coin.TRANSFER",
            args: [
              params.senderAccount,
              params.receiverAccount,
              { decimal: params.amount },
            ],
          },
        ],
      },
    ],
  };

  return { cmd: JSON.stringify(cmd), hash: "", sigs: [undefined] };
}

export function buildKadenaSignRequest(params: KadenaTransferParams) {
  const command = buildPactCommand(params);
  return {
    method: "kadena_sign",
    params: command,
  };
}

export function buildKadenaQuicksignRequest(params: KadenaTransferParams) {
  const command = buildPactCommand(params);
  return {
    method: "kadena_quicksign",
    params: {
      commandSigDatas: [
        {
          cmd: command.cmd,
          sigs: [{ pubKey: params.senderPublicKey, sig: null }],
        },
      ],
    },
  };
}
