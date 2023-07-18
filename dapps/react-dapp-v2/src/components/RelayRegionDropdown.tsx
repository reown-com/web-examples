import * as React from "react";
import { REGIONALIZED_RELAYER_ENDPOINTS } from "../constants/default";
import styled from "styled-components";
import Icon from "./Icon";
import { useState } from "react";

interface RelayRegionDropdownProps {
  relayerRegion: string;
  setRelayerRegion?: (relayer: string) => void;
  show: boolean;
}

const SelectContainer = styled.select`
  width: 150px;
  background: transparent;
  color: black;
  height: 30px;
  border-radius: 4px;
  padding: 2px;
  font-size: "1.25em";
  bottom: 40px;
  left: 50px;
  direction: ltr;
  unicode-bidi: embed;
  margin: 5px;
`;

const SelectOption = styled.option`
  font-size: "1.25em";
`;

const RelayRegionDropdown = (props: RelayRegionDropdownProps) => {
  const { relayerRegion, setRelayerRegion, show } = props;
  return (
    <div>
      {show && (
        <SelectContainer
          value={relayerRegion}
          onChange={(e) => setRelayerRegion?.(e?.target?.value)}
        >
          <option disabled>Relayer Region:</option>
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

export default RelayRegionDropdown;
