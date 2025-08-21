import React, { useState } from "react";
import { ethers } from "ethers";

interface BalanceComponentProps {
  provider: any;
  ethersWeb3Provider: ethers.BrowserProvider;
}

const BalanceComponent: React.FC<BalanceComponentProps> = ({
  provider,
  ethersWeb3Provider,
}) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getBalance = async () => {
    setIsLoading(true);
    try {
      const signer = await ethersWeb3Provider.getSigner();
      const address = await signer.getAddress();
      const balanceFromEthers = await ethersWeb3Provider.getBalance(address);
      const remainder = balanceFromEthers % BigInt(1e14);
      setBalance(ethers.formatEther(balanceFromEthers - remainder));
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={getBalance} disabled={isLoading}>
        {isLoading ? "Loading..." : "Get Balance"}
      </button>
      <p>
        Balance: {balance ? `${balance} ETH` : "Click 'Get Balance' to fetch"}
      </p>
    </div>
  );
};

export default BalanceComponent;
