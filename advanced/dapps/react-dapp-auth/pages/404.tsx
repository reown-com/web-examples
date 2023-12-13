import { Box, Heading, Text, Flex, Button } from "@chakra-ui/react";
import Link from "next/link";

const Page404 = () => {
  return (
    <Flex minHeight="100vh" direction="column" justifyContent="center">
      <Box marginY={4}>
        <Heading textAlign="center" size="lg">
          Page not Found.
        </Heading>

        <Flex
          flexDirection="column"
          justifyContent="center"
          textAlign="center"
          marginTop={4}
          gap={2}
        >
          <Text fontSize="sm" color="gray">
            It&apos;s Okay!
          </Text>
          <Link href="/">
            <Button
              padding={2}
              backgroundColor="#3396FF"
              rounded="xl"
              _hover={{
                border: "solid 1px #3396FF",
                backgroundColor: "black",
              }}
            >
              Let&apos;s Head Back
            </Button>
          </Link>
        </Flex>
      </Box>
    </Flex>
  );
};

export default Page404;
