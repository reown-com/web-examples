import {
  Text,
  Container,
  Divider,
  Flex,
  Heading,
  useToast,
  Button,
  Grid,
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
    <Container>
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
            height="20em"
            width="20em"
            style={{
              borderRadius: "24px",
              minWidth: "25em",
              minHeight: "25em",
            }}
          />
        </Grid>

        <Flex gap="3" flexDir="column" alignItems="center" padding="2em">
          <Text fontWeight={800} textAlign="center" fontSize="1.5em">
            Scan with your phone
          </Text>

          <Text fontWeight={600} textAlign="center">
            Open your camera app or mobile wallet and scan the code to connect
          </Text>
          <Button onClick={onClick} borderRadius="16px" className="wc-button">
            Copy to clipboard
          </Button>
        </Flex>
      </Flex>
    </Container>
  );
};

export default QrView;
