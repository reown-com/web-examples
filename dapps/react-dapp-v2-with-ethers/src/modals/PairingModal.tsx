import * as React from "react";

import { PairingTypes } from "@walletconnect/types";

import Button from "../components/Button";
import Pairing from "../components/Pairing";
import { STable } from "../components/shared";

import { SModalContainer, SModalTitle } from "./shared";
import { useWalletConnectClient } from "../contexts/ClientContext";

interface PairingModalProps {
  pairings: PairingTypes.Settled[];
  connect: any;
  enable: any;
  selectedChainId?: string;
}

const PairingModal = (props: PairingModalProps) => {
  const { client } = useWalletConnectClient();
  const { pairings, enable, selectedChainId } = props;
  return (
    <SModalContainer>
      <SModalTitle>{"Select available pairing or create new one"}</SModalTitle>
      <STable>
        {pairings.map(pairing => (
          <Pairing
            key={pairing.topic}
            pairing={pairing}
            // @ts-ignore
            // onClick={async () => {
            //   const _pairing = await client?.pairing.get(pairing.topic);
            //   console.log(_pairing);
            // }}
            onClick={() => client?.connect({ topic: pairing.topic })}
          />
        ))}
      </STable>
      <Button onClick={() => enable(selectedChainId)}>{`New Pairing`}</Button>
    </SModalContainer>
  );
};

export default PairingModal;
