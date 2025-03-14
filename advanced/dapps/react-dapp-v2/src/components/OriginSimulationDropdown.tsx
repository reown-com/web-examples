import * as React from "react";
import { ORIGIN_OPTIONS } from "../constants/default";
import { styled } from "styled-components";

interface OriginSimulationProps {
  origin: string;
  show: boolean;
}

interface SelectContainerProps {
  value?: string;
  onChange?: (e: any) => void;
  children?: React.ReactNode;
}

const SelectContainer = styled.select<SelectContainerProps>`
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

interface SelectOptionProps {
  value?: string;
  selected?: boolean;
  children?: React.ReactNode;
}

const SelectOption = styled.option<SelectOptionProps>`
  font-size: "1.25em";
`;

const OriginSimulationDropdown = (props: OriginSimulationProps) => {
  const { show } = props;
  const [selectedOrigin, setSelectedOrigin] = React.useState(props.origin);
  React.useEffect(() => {
    if (!show) {
      return;
    }

    setSelectedOrigin(
      localStorage.getItem("wallet_connect_dapp_origin") || props.origin
    );
  }, [show, props.origin]);

  const setOrigin = React.useCallback((origin: string) => {
    localStorage.setItem("wallet_connect_dapp_origin", origin);
    location.reload();
  }, []);
  return (
    <div>
      {show && (
        <SelectContainer
          value={selectedOrigin}
          onChange={(e) => setOrigin(e?.target?.value)}
        >
          <option disabled>Origin Url:</option>
          {ORIGIN_OPTIONS.map((e, i) => {
            const seleted = e.value === selectedOrigin;
            console.log("selected", seleted, e.value);
            return (
              <SelectOption key={i} value={e.value} selected={seleted}>
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
