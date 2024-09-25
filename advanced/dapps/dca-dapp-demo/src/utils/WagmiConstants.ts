import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { baseSepolia, type Chain } from "wagmi/chains";
import { ConstantsUtil } from "./ConstantsUtil";
import type { CreateConnectorFn } from "wagmi";

export const WagmiConstantsUtil = {
  chains: [baseSepolia] as [Chain, ...Chain[]],
};

export function getWagmiConfig(
  type: "default" | "email",
  connectors: CreateConnectorFn[] = [],
) {
  const config = {
    chains: WagmiConstantsUtil.chains,
    projectId: ConstantsUtil.ProjectId,
    metadata: ConstantsUtil.Metadata,
    ssr: true,
    connectors,
  };

  const emailConfig = {
    ...config,
    auth: {
      socials: [
        "google",
        "x",
        "discord",
        "farcaster",
        "github",
        "apple",
        "facebook",
      ],
    },
    connectors,
  };

  const wagmiConfig = defaultWagmiConfig(
    type === "email" ? emailConfig : config,
  );

  return wagmiConfig;
}
