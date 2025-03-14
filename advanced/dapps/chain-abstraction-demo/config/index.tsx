import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrum, optimism, base } from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error("Project ID is not defined");
}

export const networks = [base, optimism, arbitrum];

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks,
});

export const metadata = {
  name: "Chain Abstraction Demo",
  description: "A demo of Chain Abstraction",
  url: "https://ca-demo.reown.com", // origin must match your domain & subdomain
  icons: ["https://ca-demo.reown.com/donut.png"],
};

export const config = wagmiAdapter.wagmiConfig;
