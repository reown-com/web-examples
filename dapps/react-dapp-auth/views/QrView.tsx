import {
  Text,
  Box,
  Divider,
  Flex,
  Heading,
  useToast,
  Button,
  Grid,
  Image,
} from "@chakra-ui/react";
import Qrcode from "qrcode";
import { useEffect, useRef } from "react";

const QrView: React.FC<{ uri: string }> = ({ uri }) => {
  const canvasRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (uri && canvasRef.current) Qrcode.toCanvas(canvasRef.current, uri);
  }, [uri, canvasRef]);

  const onClick = async () => {
    await navigator.clipboard.writeText(uri);
    toast({
      title: "Copied URI",
    });
  };

  return (
    <Box width="100%" height="100%" padding="1em">
      <Flex
        className="bg-secondary"
        alignItems="center"
        borderRadius="24px"
        flexDir="column"
      >
        <Grid
          padding="2em"
          borderTopRadius="24px"
          placeItems="center"
          className="bg-qr"
          borderBottom="solid 1px white"
          width="100%"
          height="100%"
        >
          <canvas
            onClick={onClick}
            ref={canvasRef}
            height="20%"
            width="20%"
            style={{
              borderRadius: "24px",
              minWidth: "20%",
              minHeight: "20%",
            }}
          />
        </Grid>

        <Flex gap="3" flexDir="column" alignItems="center" padding="2em">
          <Flex gap="1em">
            <Image src="/scan.svg" alt="scan" />
            <Text fontWeight={800} textAlign="center" fontSize="1.5em">
              Scan with your phone
            </Text>
          </Flex>

          <Text fontWeight={600} textAlign="center">
            Open your camera app or mobile wallet and scan the code to connect
          </Text>
          <Button onClick={onClick} borderRadius="20px" className="wc-button">
            <Flex gap="1em">
              <Image src="/copy.svg" alt="scan" />
              <Text>Copy to clipboard</Text>
            </Flex>
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default QrView;
