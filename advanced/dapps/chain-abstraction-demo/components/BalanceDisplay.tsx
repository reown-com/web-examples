import { type TokenBalance } from "@/utils/BalanceFetcherUtil";

interface BalanceDisplayProps {
  balances: TokenBalance[];
  isLoading: boolean;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  balances,
  isLoading,
}) => {
  if (isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-secondary mt-2">
      {balances.map((token) => (
        <div key={token.address}>
          Available {token.symbol} Balance: {token.balance} {token.symbol}
        </div>
      ))}
    </div>
  );
};
