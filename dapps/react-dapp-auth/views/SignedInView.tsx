import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Image,
  Spinner,
  Text,
} from "@chakra-ui/react";
import truncate from "smart-truncate";
import { providers } from "ethers";

import { useCallback, useEffect, useState } from "react";

const SignedInView: React.FC<{ address: string }> = ({ address }) => {
  const [balance, setBalance] = useState<number>();
  const [avatar, setAvatar] = useState<string | null>();
  const [isLoading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const innerEffect = async (address: string) => {
      setLoading(true);
      const provider = new providers.JsonRpcProvider(
        `https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=${process.env.NEXT_PUBLIC_PROJECT_ID}`
      );
      const avatar = await provider.getAvatar(address);
      const balance = await provider.getBalance(address);
      setAvatar(avatar);
      setBalance(balance.toNumber());
      setLoading(false);
    };
    if (address) {
      innerEffect(address);
    }
  }, [setBalance, address]);

  const onSignOut = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <Box className="bg-secondary" borderRadius={"24px"} padding="2em">
      <Flex flexDir={"column"} gap="5">
        <Flex justifyContent="space-between" gap="10">
          <Grid
            borderRadius={"100%"}
            width="6em"
            height="6em"
            className="bg-qr"
            border="solid 1px #585F5F"
            placeItems="center"
          >
            {isLoading ? (
              <Spinner />
            ) : (
              avatar && <Image src={avatar} alt="avatar" />
            )}
          </Grid>
          <Flex
            padding="0.5em"
            border="solid 1px #585F5F"
            borderRadius={"16px"}
            height={"min-content"}
            className="bg-qr"
            alignItems="center"
            gap="0.5em"
          >
            <Box
              width="0.75em"
              height="0.75em"
              backgroundColor="#2BEE6C"
              borderRadius={"100%"}
              style={{ filter: "blur(1px)" }}
            />
            <span>Connected</span>
          </Flex>
        </Flex>
        <Flex>
          <Text fontWeight="800" fontSize={"1.5em"}>
            {truncate(address, 12, { position: 7 })}
          </Text>
        </Flex>
        <Divider />
        <Flex
          justifyContent="space-between"
          fontSize={"1.5em"}
          alignItems="center"
        >
          <Text>Balance</Text>
          {isLoading ? (
            <Spinner />
          ) : (
            <Flex alignItems="center" gap="2">
              <Image src="/eth.png" alt="ETH" width="1.5em" height="1.5em" />
              <Text>{balance} ETH</Text>
            </Flex>
          )}
        </Flex>
        <Flex width={"100%"} justifyContent="center">
          <Button
            width={"100%"}
            className="wc-button"
            padding={"1.5em"}
            borderRadius={"16px"}
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default SignedInView;
