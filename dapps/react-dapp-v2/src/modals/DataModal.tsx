import * as React from "react";

import { PairingTypes } from "@walletconnect/types";

import Button from "../components/Button";
import Pairing from "../components/Pairing";
import { STable } from "../components/shared";

import { SModalContainer, SModalTitle } from "./shared";
import { useState } from "react";

interface DataModalProps {
  submit: (data: string) => void;
}

const DataModal = (props: DataModalProps) => {
  const [data, setData] = useState("");
  const { submit } = props;
  return (
    <SModalContainer>
      <SModalTitle>Enter data to send</SModalTitle>
      <STable>
        <input
          type="text"
          value={data}
          onChange={(event) => setData(event.currentTarget.value)}
        />
      </STable>
      <Button onClick={() => submit(data)}>Submit</Button>
    </SModalContainer>
  );
};

export default DataModal;
