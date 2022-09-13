import "../styles/globals.css";
import type { AppProps } from "next/app";
import { version } from "@walletconnect/auth-client/package.json";
import {
  ChakraProvider,
  Box,
  Flex,
  Grid,
  GridItem,
  Image,
  Text,
} from "@chakra-ui/react";
import ThemeSwitcher from "../components/ThemeSwitcher";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Box
        width="100vw"
        style={{ width: "100vw", height: "100vh" }}
        className="bg-primary"
      >
        <Grid
          templateAreas={`
          "header"
          "main"
          "footer"
				`}
          style={{ height: "100%", width: "100%" }}
          gridTemplateRows={"50px 3f 20px"}
          gridTemplateColumns={"1fr"}
          paddingY="2em"
        >
          <GridItem area={"header"}>
            <Flex
              alignItems="center"
              justifyContent="center"
              gap="5"
              fontSize={"1.25em"}
            >
              <div>Example App</div>
              <Flex
                padding="0.5em"
                borderRadius="16px"
                className="bg-secondary"
                gap="2"
              >
                <Image
                  width="1.5em"
                  height="1.5em"
                  src="/wc-bg.png"
                  alt="WC"
                ></Image>
                <span>V{version}</span>
              </Flex>
            </Flex>
          </GridItem>
          <Flex justifyContent="center">
            <GridItem area={"main"} justifyContent="center">
              <Component {...pageProps} />
            </GridItem>
          </Flex>
          <GridItem area={"footer"} alignSelf="flex-end">
            <Flex justifyContent="flex-end">
              <ThemeSwitcher />
            </Flex>
          </GridItem>
        </Grid>
      </Box>
    </ChakraProvider>
  );
}

export default MyApp;
