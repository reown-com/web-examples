import * as React from "react";
import { REGIONALIZED_RELAYER_ENDPOINTS } from "../constants/default";
import Select from "react-select";

interface DropdownProps {
  relayerRegion: string;
  setRelayerRegion?: (relayer: string) => void;
}

const Dropdown = (props: DropdownProps) => {
  const { relayerRegion, setRelayerRegion } = props;

  const checkRelayerRegion = (value: string) => {
    if (relayerRegion === REGIONALIZED_RELAYER_ENDPOINTS[0].value) {
      return REGIONALIZED_RELAYER_ENDPOINTS[0].label;
    }
    if (relayerRegion === REGIONALIZED_RELAYER_ENDPOINTS[1].value) {
      return REGIONALIZED_RELAYER_ENDPOINTS[1].label;
    }
    if (relayerRegion === REGIONALIZED_RELAYER_ENDPOINTS[2].value) {
      return REGIONALIZED_RELAYER_ENDPOINTS[2].label;
    }
    if (relayerRegion === REGIONALIZED_RELAYER_ENDPOINTS[3].value) {
      return REGIONALIZED_RELAYER_ENDPOINTS[3].label;
    }
  };

  return (
    <div>
      <p>Relayer Region:</p>
      <div>
        <Select
          options={REGIONALIZED_RELAYER_ENDPOINTS}
          placeholder={
            checkRelayerRegion(relayerRegion) ||
            REGIONALIZED_RELAYER_ENDPOINTS[0].label
          }
          value={relayerRegion}
          onChange={(e) => setRelayerRegion(e.value)}
        />
      </div>
    </div>
  );
};

export default Dropdown;
