import * as React from "react";
import { REGIONALIZED_RELAYER_ENDPOINTS } from "../constants/default";
import styled from "styled-components";
import Icon from "./Icon";
import { useState } from "react";

interface DropdownProps {
  relayerRegion: string;
  setRelayerRegion?: (relayer: string) => void;
}

const SelectContainer = styled.select`
  width: 150px;
  background: transparent;
  color: black;
  height: 30px;
  border-radius: 4px;
  padding: 2px;
  font-size: "1.25em";
  position: absolute;
  bottom: 40px;
  left: 50px;
  direction: ltr;
  unicode-bidi: embed;
`;

const SelectOption = styled.option`
  font-size: "1.25em";
`;

const Dropdown = (props: DropdownProps) => {
  const { relayerRegion, setRelayerRegion } = props;
  const [openSelect, setOpenSelect] = useState(false);
  const selectRef = React.createRef();

  const openDropdown = () => {
    setOpenSelect(!openSelect);
  };

  return (
    <div
      style={{
        paddingTop: 72,
        width: 250,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <button onClick={openDropdown} style={{ background: "transparent" }}>
        <Icon size={30} src={"/assets/settings.svg"} />
      </button>
      {openSelect && (
        <SelectContainer
          value={relayerRegion}
          onChange={(e) => setRelayerRegion?.(e?.target?.value)}
        >
          <option selected disabled>
            Relayer Region:
          </option>
          {REGIONALIZED_RELAYER_ENDPOINTS.map((e, i) => {
            return (
              <SelectOption key={i} value={e.value}>
                {e.label}
              </SelectOption>
            );
          })}
        </SelectContainer>
      )}
    </div>
  );
};

export default Dropdown;
