import { Box } from "@chakra-ui/react";
import AuthClient, { generateNonce } from "@walletconnect/auth-client";
import { version } from "@walletconnect/auth-client/package.json";
import type { NextPage } from "next";
import { useCallback, useEffect, useState } from "react";
import DefaultView from "../views/DefaultView";
import SignedInView from "../views/SignedInView";
import type { W3mModal } from "@web3modal/ui";
import { ModalCtrl } from "@web3modal/core";
import "@web3modal/ui";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "w3m-modal": Partial<W3mModal>;
    }
  }
}

const Home: NextPage = () => {
  const [client, setClient] = useState<AuthClient | null>();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [uri, setUri] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  const onSignIn = useCallback(() => {
    if (!client) return;
    client
      .request({
        aud: window.location.href,
        domain: window.location.hostname.split(".").slice(-2).join("."),
        chainId: "eip155:1",
        type: "eip4361",
        nonce: generateNonce(),
        statement: "Sign in with wallet.",
      })
      .then(({ uri }) => setUri(uri));
  }, [client, setUri]);

  useEffect(() => {
    AuthClient.init({
      relayUrl:
        process.env.NEXT_PUBLIC_RELAY_URL || "wss://relay.walletconnect.com",
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      metadata: {
        name: "react-dapp-auth",
        description: "React Example Dapp for Auth",
        url: window.location.host,
        icons: [],
      },
    })
      .then((authClient) => {
        setClient(authClient);
        setHasInitialized(true);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!client) return;
    client.on("auth_response", ({ params }) => {
      if ("code" in params) {
        console.error(params);
        return;
      }
      if ("error" in params) {
        console.error(params.error);
        return;
      }
      setAddress(params.result.p.iss.split(":")[4]);
    });
  }, [client]);

  const [view, changeView] = useState<"default" | "qr" | "signedIn">("default");

  useEffect(() => {
    if (uri) {
      ModalCtrl.open({ uri, standaloneChains: ["eip155:1"] });
    }
  }, [uri]);

  useEffect(() => {
    if (address) {
      ModalCtrl.close();
      changeView("signedIn");
    }
  }, [address, changeView]);

  return (
    <Box width="100%" height="100%">
      {view === "default" && (
        <DefaultView onClick={onSignIn} hasInitialized={hasInitialized} />
      )}
      {view === "signedIn" && <SignedInView address={address} />}
      <w3m-modal></w3m-modal>
    </Box>
  );
};

export default Home;
