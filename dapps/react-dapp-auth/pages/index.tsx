import {
  Button,
  Container,
  Text,
  Divider,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import AuthClient from "@walletconnect/auth-client";
import type { NextPage } from "next";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import DefaultView from "../views/DefaultView";
import QrView from "../views/QrView";
import SignedInView from "../views/SignedInView";

const Home: NextPage = () => {
  const [client, setClient] = useState<AuthClient | null>();
  const [uri, setUri] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const toast = useToast();

  const onSignIn = useCallback(() => {
    if (!client) return;
    client
      .request({
        aud: "http://localhost:3000/",
        domain: "localhost:3000",
        chainId: "1",
        type: "eip4361",
        nonce: "nonce",
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
      .then((v) => {
        setClient(v);
      })
      .catch(console.log);
  }, [setClient]);

  useEffect(() => {
    if (!client) return;
    client.on("auth_response", (res) => {
      if (res.params.code !== -1) {
        setAddress(res.params.result.payload.iss.split(":")[4]);
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
    <Container>
      {view === "default" && <DefaultView onClick={onSignIn} />}
      {view === "qr" && <QrView uri={uri} />}
      {view === "signedIn" && <SignedInView address={address} />}
    </Container>
  );
};

export default Home;
