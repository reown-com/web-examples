import * as React from "react";
import { ORIGIN_OPTIONS } from "../constants/default";
import styled from "styled-components";

interface IsScamSimulationProps {
  show: boolean;
}

const StyledCheckboxContainer = styled.div`
  width: max-content;
  margin: auto;
  display: table;
`;

const StyledCheckbox = styled.input`
  width: 25px;
  height: 25px;
  -webkit-appearance: checkbox;
  accent-color: red;
  vertical-align: middle;
`;
const StyledSpan = styled.span`
  vertical-align: middle;
`;

const IsScamSimulation = (props: IsScamSimulationProps) => {
  const { show } = props;
  const setOrigin = React.useCallback((origin: string) => {
    localStorage.setItem("wallet_connect_dapp_origin", origin);
    location.reload();
  }, []);
  return (
    <>
      {show && (
        <StyledCheckboxContainer>
          <StyledSpan>is scam?</StyledSpan>
          <StyledCheckbox type="checkbox" name="checkall" />
        </StyledCheckboxContainer>
      )}
    </>
  );
};

export default IsScamSimulation;
