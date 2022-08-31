import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider, Container, Flex, Image, Text } from "@chakra-ui/react";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Container height="100vh" width="100vw">
        <Flex py={5} gap={20} height={"100%"} direction="column">
          <Flex
            alignItems="center"
            alignContent="center"
            justifyContent="space-between"
            p={5}
            backgroundColor={"rgba(39,42,42,.95)"}
            borderRadius={"16px"}
          >
            <Image width={10} src="/walletconnect.png" />
            <Flex gap={5}>
              <Text fontWeight={900}>Request Authentication</Text>
            </Flex>
          </Flex>
          <Component {...pageProps} />
        </Flex>
      </Container>
    </ChakraProvider>
  );
}

export default MyApp;
