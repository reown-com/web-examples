import React, { PropsWithChildren, FC } from "react";
import { styled } from "styled-components";

import Asset from "./Asset";
import Button from "./Button";
import Column from "./Column";
import Loader from "./Loader";

import { getChainMetadata } from "../chains";
import {
  AccountAction,
  ellipseAddress,
  AccountBalances,
  ChainMetadata,
  ChainNamespaces,
  ChainData,
} from "../helpers";
import { fonts } from "../styles";
import Icon from "./Icon";

interface AccountStyleProps {
  rgb: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const SAccount = styled.div<AccountStyleProps>`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-radius: 8px;
  padding: 8px;
  margin: 5px 0;
  border: ${({ rgb }) => `2px solid rgb(${rgb})`};
  &.active {
    box-shadow: ${({ rgb }) => `0 0 8px rgb(${rgb})`};
  }
`;

const SChain = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  & p {
    font-weight: 600;
  }
  & img {
    border-radius: 50%;
    width: 35px;
    height: 35px;
    margin-right: 10px;
  }
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SFullWidthContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

interface ActionProps {
  rgb: string;
}

const SAction = styled(Button)<ActionProps>`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
  background-color: ${({ rgb }) => `rgb(${rgb})`};
`;

const SBlockchainChildrenContainer = styled(SFullWidthContainer)`
  flex-direction: column;
`;

const STooltipContainer = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  cursor: help;

  & svg {
    display: block;
  }

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 12px;
    background-color: rgba(0, 0, 0, 0.9);
    color: white;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    margin-bottom: 8px;
    pointer-events: none;
  }

  &:hover::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
    margin-bottom: 2px;
    z-index: 1000;
    pointer-events: none;
  }
`;

interface BlockchainProps {
  chainData: ChainNamespaces;
  fetching?: boolean;
  active?: boolean;
  chainId: string;
  address?: string;
  onClick?: (chain: string) => void;
  balances?: AccountBalances;
  actions?: AccountAction[];
  isAuthenticated?: boolean;
}

interface BlockchainDisplayData {
  data: ChainData;
  meta: ChainMetadata;
}

function getBlockchainDisplayData(
  chainId: string,
  chainData: ChainNamespaces
): BlockchainDisplayData | undefined {
  const [namespace, reference] = chainId.split(":");
  let meta: ChainMetadata;
  try {
    meta = getChainMetadata(chainId);
  } catch (e) {
    return undefined;
  }
  const namespaceData = chainData[namespace];
  if (!namespaceData) return undefined;
  const data: ChainData = namespaceData[reference];
  if (typeof data === "undefined") return undefined;
  return { data, meta };
}

const Blockchain: FC<PropsWithChildren<BlockchainProps>> = (
  props: PropsWithChildren<BlockchainProps>
) => {
  const {
    chainData,
    fetching,
    chainId,
    address,
    onClick,
    active,
    balances,
    actions,
    isAuthenticated,
  } = props;
  if (!Object.keys(chainData).length) return null;

  const chain = getBlockchainDisplayData(chainId, chainData);

  if (typeof chain === "undefined") return null;

  const name = chain.meta.name || chain.data.name;
  const account =
    typeof address !== "undefined" ? `${chainId}:${address}` : undefined;
  const assets =
    typeof account !== "undefined" && typeof balances !== "undefined"
      ? balances[account]
      : [];

  return (
    <React.Fragment>
      <SAccount
        rgb={chain.meta.rgb}
        onClick={() => onClick && onClick(props.chainId)}
        className={active ? "active" : ""}
      >
        <SChain>
          <img src={chain.meta.logo} alt={name} />
          <p>{name}</p>
        </SChain>
        {!!address && (
          <p>
            {ellipseAddress(address)}{" "}
            {isAuthenticated && (
              <STooltipContainer data-tooltip="Address ownership has been verified by a signature">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z"
                    fill="#10B981"
                    fillOpacity="0.2"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12L11 14L15 10"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </STooltipContainer>
            )}
          </p>
        )}
        <SBlockchainChildrenContainer>
          {fetching ? (
            <Column center>
              <SContainer>
                <Loader rgb={`rgb(${chain.meta.rgb})`} />
              </SContainer>
            </Column>
          ) : (
            <>
              {!!assets && assets.length ? (
                <SFullWidthContainer>
                  <h6>Balances</h6>
                  <Column center>
                    {assets.map((asset) =>
                      asset.symbol ? (
                        <Asset key={asset.symbol} asset={asset} />
                      ) : null
                    )}
                  </Column>
                </SFullWidthContainer>
              ) : null}
              {address && !!actions && actions.length ? (
                <SFullWidthContainer>
                  <h6>Methods</h6>
                  {actions.map((action) => (
                    <SAction
                      key={action.method}
                      left
                      rgb={chain.meta.rgb}
                      onClick={() => action.callback(chainId, address)}
                    >
                      {action.method}
                    </SAction>
                  ))}
                </SFullWidthContainer>
              ) : null}
            </>
          )}
        </SBlockchainChildrenContainer>
      </SAccount>
    </React.Fragment>
  );
};
export default Blockchain;
