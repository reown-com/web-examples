import * as React from "react";
import { REGIONALIZED_RELAYER_ENDPOINTS } from "../constants/default";
import styled from "styled-components";

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
`;

const SelectOption = styled.option`
  font-size: "1.25em";
`;

const Dropdown = (props: DropdownProps) => {
  const { relayerRegion, setRelayerRegion } = props;

  return (
    <div>
      <p style={{ textAlign: "center" }}>Relayer Region:</p>
      <div>
        <SelectContainer
          value={relayerRegion}
          onChange={(e) => setRelayerRegion?.(e?.target?.value)}
        >
          {REGIONALIZED_RELAYER_ENDPOINTS.map((e, i) => {
            return (
              <SelectOption key={i} value={e.value}>
                {e.label}
              </SelectOption>
            );
          })}
        </SelectContainer>
      </div>
    </div>
  );
};

export default Dropdown;
