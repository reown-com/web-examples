import * as React from "react";
import * as PropTypes from "prop-types";
import styled, { keyframes } from "styled-components";
import { DEFAULT_RELAY_URL } from "../constants/default";

const regionalizedEndpointData = [
  {
    region: "Default",
    endPoint: DEFAULT_RELAY_URL,
  },

  {
    region: "USA",
    endPoint: "wss://us-east-1.relay.walletconnect.com/",
  },
  {
    region: "EU",
    endPoint: "wss://eu-central-1.relay.walletconnect.com/",
  },
  {
    region: "Asia Pacific",
    endPoint: "wss://ap-southeast-east-1.relay.walletconnect.com/",
  },
];

interface DropdownProps {
  setRelayerRegion?: (relayer: string) => void;
}

const Dropdown = (props: DropdownProps) => {
  const { setRelayerRegion } = props;

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <p>Select Region:</p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid grey",
        }}
      >
        {regionalizedEndpointData.map((e, i) => (
          <div onClick={() => setRelayerRegion(e.endPoint)} key={i}>
            {e.region}
          </div>
        ))}
      </div>
    </div>
  );
};

// this.state.data.map(function(item, i){
//   console.log('test');
//   return <li key={i}>Test</li>
// })

// Loader.propTypes = {
//   size: PropTypes.number,
//   color: PropTypes.string,
// };

// Loader.defaultProps = {
//   size: 40,
//   color: "lightBlue",
// };

export default Dropdown;
