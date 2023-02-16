import { Box } from "@chakra-ui/react";
import AuthClient, { generateNonce } from "@walletconnect/auth-client";
import { version } from "@walletconnect/auth-client/package.json";
import type { NextPage } from "next";
import { useCallback, useEffect, useState } from "react";
import DefaultView from "../views/DefaultView";
import QrView from "../views/QrView";
import SignedInView from "../views/SignedInView";

console.log(`AuthClient@${version}`);

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
      .then(({ uri }) => {
        if (uri) {
          setUri(uri);
        }
      });
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
    if (uri) changeView("qr");
  }, [uri, changeView]);

  useEffect(() => {
    if (address) changeView("signedIn");
  }, [address, changeView]);

  return (
    <Box width="100%" height="100%">
      {view === "default" && (
        <DefaultView onClick={onSignIn} hasInitialized={hasInitialized} />
      )}
      {view === "qr" && <QrView uri={uri} />}
      {view === "signedIn" && <SignedInView address={address} />}
    </Box>
  );
};

export default Home;
