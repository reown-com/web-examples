import * as React from "react";
import styled from "styled-components";

import Icon from "./Icon";

import { AssetData } from "../helpers";

import eth from "../assets/eth.svg";
import erc20 from "../assets/erc20.svg";
import { getChainMetadata } from "../chains";

const xdai = getChainMetadata("eip155:100").logo;
const matic = getChainMetadata("eip155:137").logo;

const SAsset = styled.div`
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
`;
const SAssetLeft = styled.div`
  display: flex;
`;

const SAssetName = styled.div`
  display: flex;
  margin-left: 10px;
`;

const SAssetRight = styled.div`
  display: flex;
`;

const SAssetBalance = styled.div`
  display: flex;
`;

// eslint-disable-next-line
function getAssetIcon(asset: AssetData): JSX.Element {
  if (!!asset.contractAddress) {
    const src = `https://raw.githubusercontent.com/TrustWallet/tokens/master/tokens/${asset.contractAddress.toLowerCase()}.png`;
    return <Icon src={src} fallback={erc20} />;
  }
  switch (asset.symbol.toLowerCase()) {
    case "eth":
      return <Icon src={eth} />;
    case "xdai":
      return <Icon src={xdai} />;
    case "matic":
      return <Icon src={matic} />;
    default:
      return <Icon src={erc20} />;
  }
}

interface AssetProps {
  asset: { symbol: string; balance: string };
}

const Asset = (props: AssetProps) => {
  const { asset } = props;
  return (
    <SAsset {...props}>
      <SAssetLeft>
        {/* {getAssetIcon(asset)} */}
        <SAssetName>{asset.symbol}</SAssetName>
      </SAssetLeft>
      <SAssetRight>
        <SAssetBalance>{`${asset.balance}`}</SAssetBalance>
      </SAssetRight>
    </SAsset>
  );
};

export default Asset;
