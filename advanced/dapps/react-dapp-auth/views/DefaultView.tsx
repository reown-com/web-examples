import { Box, Button, Flex, Heading, Image, position } from "@chakra-ui/react";

const DefaultView: React.FC<{
  onClick: () => void;
  hasInitialized: boolean;
}> = ({ onClick, hasInitialized }) => {
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
        padding="2em 3em"
        borderRadius={"24px"}
        className="bg-secondary"
        alignItems={"center"}
      >
        <Heading>Sign in</Heading>
        <Button
          minW="80%"
          paddingY="1.25em"
          fontSize={"1.25em"}
          onClick={onClick}
          borderRadius={"16px"}
          background="#3396FF"
          disabled={!hasInitialized}
        >
          <Flex gap="1em">
            <Image src="/wc.png" fit="scale-down" alt="WC" />
            <span style={{ color: "white" }}>
              {hasInitialized ? "WalletConnect" : "Initializing..."}
            </span>
          </Flex>
        </Button>
      </Flex>
    </Box>
  );
};

export default DefaultView;
