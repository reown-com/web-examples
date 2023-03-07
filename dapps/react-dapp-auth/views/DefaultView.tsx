import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { PairingTypes } from "@walletconnect/types/dist/types/core/pairing";

const DefaultView: React.FC<{
  onSignIn: (topic?: string) => void;
  hasInitialized: boolean;
  pairings?: PairingTypes.Struct[];
}> = ({ onSignIn, hasInitialized, pairings }) => {
  return (
    <Box>
      <Box position={{ position: "relative" }}>
        <Flex
          style={{ position: "relative", top: "1.5em" }}
          justifyContent="center"
        >
          <Flex
            style={{ position: "absolute", top: "5%" }}
            justifyContent="center"
          >
            <Image
              style={{ filter: "blur(10px)" }}
              src="/auth.png"
              alt="auth"
            />
          </Flex>
          <Image style={{ filter: "blur(1px)" }} src="/auth.png" alt="auth" />
        </Flex>
      </Box>
      <Flex
        flexDir={"column"}
        gap="5"
        padding="2em 0em"
        borderRadius={"24px"}
        className="bg-secondary"
        alignItems={"center"}
      >
        <Tabs>
          <TabList>
            <Tab>Sign In</Tab>
            <Tab key="existing-pairings">Existing Pairings</Tab>
          </TabList>

          <TabPanels w="100%">
            <TabPanel key="sign-in">
              <Flex
                flexDir={"column"}
                gap="5"
                w="100%"
                padding="2em 3em"
                borderRadius={"24px"}
                className="bg-secondary"
                alignItems={"center"}
              >
                <Heading>Sign in</Heading>
                <Button
                  w="full"
                  paddingY="1.25em"
                  fontSize={"1.25em"}
                  onClick={() => onSignIn()}
                  borderRadius={"16px"}
                  background="#3396FF"
                  disabled={!hasInitialized}
                >
                  <Flex gap="1em">
                    <Image src="/wc.png" fit="scale-down" alt="WC" />
                    <Text color="white">
                      {hasInitialized ? "WalletConnect" : "Initializing..."}
                    </Text>
                  </Flex>
                </Button>
              </Flex>
            </TabPanel>
            <TabPanel key="existing">
              <Flex
                flexDir={"column"}
                gap="5"
                padding="2em 0em"
                borderRadius={"24px"}
                className="bg-secondary"
                alignItems={"center"}
              >
                <Heading>Existing pairings</Heading>
                <SimpleGrid column={1} gap={2}>
                  {pairings?.length &&
                    pairings.length > 0 &&
                    pairings.map((pairing) => (
                      <Button
                        key={pairing.topic}
                        minW="80%"
                        paddingY="1.25em"
                        fontSize={"1.25em"}
                        onClick={() => onSignIn(pairing.topic)}
                        borderRadius={"16px"}
                        background="#3396FF"
                      >
                        <Text>
                          {pairing.topic.slice(0, 8)}...
                          {pairing.topic.slice(56, 64)}
                        </Text>
                      </Button>
                    ))}
                </SimpleGrid>
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
    </Box>
  );
};

export default DefaultView;
