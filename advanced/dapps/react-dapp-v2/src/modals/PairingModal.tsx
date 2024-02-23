import * as React from "react";

import { PairingTypes } from "@walletconnect/types";

import Button from "../components/Button";
import Pairing from "../components/Pairing";
import { STable } from "../components/shared";

import { SModalContainer, SModalTitle } from "./shared";
import LoaderModal from "./LoaderModal";
import toast from "react-hot-toast";

interface PairingModalProps {
  pairings: PairingTypes.Struct[];
  connect: (params?: {
    pairing?: { topic: string };
    strategy?: 1 | 2 | 3 | 4;
  }) => Promise<void>;
  strategy?: 1 | 2 | 3 | 4;
}

const PairingModal = (props: PairingModalProps) => {
  const { pairings, connect, strategy } = props;
  const [pairing, setPairing] = React.useState<PairingTypes.Struct>();
  console.log("pairing", strategy);
  const onConnect = React.useCallback(
    async (pairing: PairingTypes.Struct) => {
      try {
        setPairing(pairing);
        await connect({ pairing, strategy });
      } catch (error) {
        toast.error((error as Error).message, {
          position: "bottom-left",
        });
        setPairing(undefined);
      }
    },
    [connect, strategy]
  );
  return pairing ? (
    <LoaderModal
      title={`Connecting to ${pairing?.peerMetadata?.name}`}
      text="Open your wallet to approve the connection request"
    />
  ) : (
    <SModalContainer>
      <SModalTitle>{"Select available pairing or create new one"}</SModalTitle>
      <STable>
        {pairings.map((pairing) => (
          <Pairing
            key={pairing.topic}
            pairing={pairing}
            onClick={() => onConnect(pairing)}
          />
        ))}
      </STable>
      <Button onClick={() => connect({ strategy })}>{`New Pairing`}</Button>
    </SModalContainer>
  );
};

export default PairingModal;
