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
  const [uri, setUri] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  const onSignIn = useCallback(() => {
    if (!client) return;
    client
      .request({
        aud: "http://localhost:3000/",
        domain: "localhost:3000",
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
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
      metadata: {
        name: "react-dapp-auth",
        description: "React Example Dapp for Auth",
        url: window.location.host,
        icons: [],
      },
    })
      .then((authClient) => {
        setClient(authClient);
      })
      .catch(console.log);
  }, [setClient]);

  useEffect(() => {
    if (!client) return;
    client.on("auth_response", (res) => {
      if (res.params.result.s) {
        setAddress(res.params.result.p.iss.split(":")[4]);
      }
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
      {view === "default" && <DefaultView onClick={onSignIn} />}
      {view === "qr" && <QrView uri={uri} />}
      {view === "signedIn" && <SignedInView address={address} />}
    </Box>
  );
};

export default Home;
