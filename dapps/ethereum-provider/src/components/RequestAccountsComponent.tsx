import React, { useState } from "react";

interface RequestAccountsComponentProps {
  provider: any;
  setConnected: (connected: boolean) => void;
}

const RequestAccountsComponent: React.FC<RequestAccountsComponentProps> = ({
  provider,
  setConnected,
}) => {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestAccounts = async () => {
    setIsLoading(true);
    try {
      const accountsResult = await provider.request({
        method: "eth_requestAccounts",
        params: [],
      });
      setAccounts(accountsResult as string[]);
      setConnected(true);
      console.log("Requested Accounts:", accountsResult);
    } catch (error) {
      console.error("Error requesting accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={requestAccounts} disabled={isLoading}>
        {isLoading ? "Loading..." : "Request Accounts"}
      </button>
      <p>
        Requested Accounts:{" "}
        {accounts.length > 0
          ? accounts.join(", ")
          : "Click 'Request Accounts' to fetch"}
      </p>
    </div>
  );
};

export default RequestAccountsComponent;
