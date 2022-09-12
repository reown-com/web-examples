import * as React from "react";
import { REGIONALIZED_RELAYER_ENDPOINTS } from "../constants/default";
import Select from "react-select";

interface DropdownProps {
  relayerRegion: string;
  setRelayerRegion?: (relayer: string) => void;
}

const Dropdown = (props: DropdownProps) => {
  const { relayerRegion, setRelayerRegion } = props;
  console.log("Dropdown relayerRegion", relayerRegion);

  return (
    <div>
      <p>Relayer Region:</p>
      <div>
        <Select
          placeholder="Default"
          options={REGIONALIZED_RELAYER_ENDPOINTS}
          defaultValue={REGIONALIZED_RELAYER_ENDPOINTS[0].value}
          onChange={(e) => setRelayerRegion(e.value)}
        />
      </div>
    </div>
  );
};

export default Dropdown;
