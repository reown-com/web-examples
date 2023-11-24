import * as React from "react";
import { ORIGIN_OPTIONS } from "../constants/default";
import styled from "styled-components";

interface OriginSimulationProps {
  origin: string;
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

const OriginSimulationDropdown = (props: OriginSimulationProps) => {
  const { origin, show } = props;
  const setOrigin = React.useCallback((origin: string) => {
    localStorage.setItem("wallet_connect_dapp_origin", origin);
    location.reload();
  }, []);
  return (
    <div>
      {show && (
        <SelectContainer
          value={origin}
          onChange={(e) => setOrigin(e?.target?.value)}
        >
          <option disabled>Origin Url:</option>
          {ORIGIN_OPTIONS.map((e, i) => {
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

export default OriginSimulationDropdown;
