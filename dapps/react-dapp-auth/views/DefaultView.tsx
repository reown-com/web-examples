import { Box, Button, Flex, Heading, Image } from "@chakra-ui/react";

const DefaultView: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <Box>
      <Flex
        style={{ position: "relative", top: "1.5em" }}
        justifyContent="center"
      >
        <Image style={{ filter: "blur(1px)" }} src="/auth.png" alt="auth" />
      </Flex>
      <Flex
        flexDir={"column"}
        gap="5"
        padding="2em 1em"
        borderRadius={"24px"}
        className="bg-secondary"
        alignItems={"center"}
      >
        <Heading>Sign In</Heading>
        <Button
          minW="80%"
          paddingY="1.25em"
          fontSize={"1.25em"}
          onClick={onClick}
          borderRadius={"16px"}
          background="#3396FF"
        >
          <Flex gap="1em">
            <Image src="/wc.png" fit="scale-down" alt="WC" />
            <span style={{ color: "white" }}>WalletConnect</span>
          </Flex>
        </Button>
      </Flex>
    </Box>
  );
};

export default DefaultView;
