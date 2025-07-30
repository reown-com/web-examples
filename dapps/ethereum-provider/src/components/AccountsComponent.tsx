import React, { useState } from "react";

interface AccountsComponentProps {
  provider: any;
}

const AccountsComponent: React.FC<AccountsComponentProps> = ({ provider }) => {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAccounts = async () => {
    setIsLoading(true);
    try {
      const accountsResult = await provider.request({
        method: "eth_accounts",
        params: [],
      });
      setAccounts(accountsResult as string[]);
      console.log("Accounts:", accountsResult);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={getAccounts} disabled={isLoading}>
        {isLoading ? "Loading..." : "Get Accounts"}
      </button>
      <p>
        Accounts:{" "}
        {accounts.length > 0
          ? accounts.join(", ")
          : "Click 'Get Accounts' to fetch"}
      </p>
    </div>
  );
};

export default AccountsComponent;
