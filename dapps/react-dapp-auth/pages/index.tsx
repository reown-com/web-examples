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
import Qrcode from "qrcode";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

const Home: NextPage = () => {
  const [client, setClient] = useState<AuthClient | null>();
  const [uri, setUri] = useState<string>("");
  const [accepted, setAccepted] = useState<boolean>(false);
  const toast = useToast();
  const canvasRef = useRef(null);

  const onSignIn = useCallback(() => {
    if (!client) return;
    client
      .request({
        aud: "http://localhost:3000/",
        domain: "localhost:3000",
        chainId: "eip191:1",
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
        setAccepted(true);
      }
    });
  }, [client]);

  useEffect(() => {
    if (uri && canvasRef.current) Qrcode.toCanvas(canvasRef.current, uri);
  }, [uri, canvasRef]);
  return (
    <Container>
      <Flex gap={20} height={"100%"} direction="column">
        <Flex
          boxShadow={"inner"}
          p={5}
          backgroundColor={"gray.50"}
          direction="column"
          justifyContent="space-evenly"
          borderRadius={10}
          border={"solid 2px black"}
        >
          <Heading color={"black"} textAlign="center" mb={5}>
            Sign In
          </Heading>
          <Divider mb={5}></Divider>
          <Text color={"black"} textAlign="center" padding={5}>
            Initiate the auth cycle by sending an auth request
          </Text>
          <form>
            <Container></Container>
            <Flex alignItems={"center"} gap={4} direction="column">
              <Button
                p={2}
                color={"black"}
                onClick={onSignIn}
                leftIcon={<Image width={10} src="/walletconnect.png" />}
              >
                Sign in with WalletConnect
              </Button>
              {uri && (
                <Fragment>
                  <canvas
                    onClick={() => {
                      navigator.clipboard.writeText(uri).then(() => {
                        toast({
                          title: "URI copied to clipboard",
                          status: "success",
                          duration: 1000,
                        });
                      });
                    }}
                    ref={canvasRef}
                  />
                  <Text
                    color="gray.400"
                    style={{ fontStyle: "italic", fontSize: "0.75em" }}
                  >
                    (You can copy the URI by clicking the QR code above)
                  </Text>
                </Fragment>
              )}
            </Flex>
          </form>
          {accepted && (
            <Button
              _hover={{ cursor: "pointer" }}
              p={10}
              colorScheme="green"
              isActive={false}
            >
              Authenticated
            </Button>
          )}
        </Flex>
      </Flex>
    </Container>
  );
};

export default Home;
