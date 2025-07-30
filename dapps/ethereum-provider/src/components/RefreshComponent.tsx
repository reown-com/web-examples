import React from "react";

interface RefreshComponentProps {
  provider: any;
  setConnected: (connected: boolean) => void;
}

const RefreshComponent: React.FC<RefreshComponentProps> = ({
  provider,
  setConnected,
}) => {
  const refresh = () => {
    provider.disconnect();
    window.localStorage.clear();
    setConnected(false);
  };

  return (
    <div>
      <button onClick={refresh}>Refresh (Disconnect)</button>
    </div>
  );
};

export default RefreshComponent;
