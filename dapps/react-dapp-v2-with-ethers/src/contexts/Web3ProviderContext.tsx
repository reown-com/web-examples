import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import QRCodeModal from "@walletconnect/legacy-modal";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_APP_METADATA,
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import { AccountBalances, apiGetAccountAssets } from "../helpers";
import { ERROR, getAppMetadata } from "@walletconnect/utils";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { providers } from "ethers";
import { useWalletConnectClient } from "./ClientContext";

/**
 * Types
 */
type IContext = any;

/**
 * Context
 */
export const Web3ProviderContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
export function Web3ContextProvider({ children }: { children: ReactNode | ReactNode[] }) {
  const [ethereumProvider, setEthereumProvider] = useState<EthereumProvider>();
  const [web3Provider, setWeb3Provider] = useState<providers.Web3Provider>();

  const { client } = useWalletConnectClient();

  useEffect(() => {
    const init = async () => {
      if (!client) return;

      //  Create WalletConnect Provider
      const ethereumProvider = new EthereumProvider({
        chainId: 42,
        rpc: {
          infuraId: "5dc0df7abe4645dfb06a9a8c39ede422",
        },
        // FIXME: `signer-connection` sub-dep is already specifying beta.23 -> typings mismatch.
        // @ts-ignore
        client,
      });
      const web3Provider = new providers.Web3Provider(ethereumProvider);

      setEthereumProvider(ethereumProvider);
      setWeb3Provider(web3Provider);

      // Enable session (triggers QR Code modal if we bound the listener on `client` for it).
      // const accounts = await ethereumProvider.enable();
      // console.log("accounts:", accounts);

      // const provider = new providers.Web3Provider(ethereumProvider);

      // console.log(provider);
      // console.log(await provider.listAccounts());
      // console.log(await provider.getNetwork());
      // console.log(provider.getSigner());
      // console.log(await provider.getBalance(accounts[0]));

      // const TEST_ETH_TRANSFER = {
      //   from: accounts[0],
      //   to: accounts[0],
      //   value: utils.parseEther("1").toHexString(),
      //   data: "0x",
      // };

      // const signer = provider.getSigner();
      // const transferTx = await signer.sendTransaction(TEST_ETH_TRANSFER);

      // console.log(transferTx);

      // const signer = provider.getSigner();
      // const msg = "Hello world";
      // const signature = await signer.signMessage(msg);
      // console.log("signature:", signature);
    };

    init();
  }, [client]);

  const onEnable = async () => {
    await ethereumProvider?.enable();
  };

  return (
    <Web3ProviderContext.Provider value={{ onEnable }}>{children}</Web3ProviderContext.Provider>
  );
}

export function useWeb3Provider() {
  const context = useContext(Web3ProviderContext);
  if (context === undefined) {
    throw new Error("useWeb3Provider must be used within a Web3ContextProvider");
  }
  return context;
}
