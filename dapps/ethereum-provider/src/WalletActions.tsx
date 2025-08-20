import React from "react";
import BalanceComponent from "./components/BalanceComponent";
import AccountsComponent from "./components/AccountsComponent";
import RequestAccountsComponent from "./components/RequestAccountsComponent";
import RefreshComponent from "./components/RefreshComponent";
import SendRawTransactionComponent from "./components/SendRawTransactionComponent";

interface WalletActionsProps {
  provider: any;
  ethersWeb3Provider: any;
  setConnected: (connected: boolean) => void;
}

const WalletActions: React.FC<WalletActionsProps> = ({
  provider,
  ethersWeb3Provider,
  setConnected,
}) => {
  return (
    <>
      <BalanceComponent
        provider={provider}
        ethersWeb3Provider={ethersWeb3Provider}
      />
      <AccountsComponent provider={provider} />
      <RequestAccountsComponent
        provider={provider}
        setConnected={setConnected}
      />
      <SendRawTransactionComponent
        provider={provider}
        ethersWeb3Provider={ethersWeb3Provider}
      />
      <RefreshComponent provider={provider} setConnected={setConnected} />
    </>
  );
};

export default WalletActions;
