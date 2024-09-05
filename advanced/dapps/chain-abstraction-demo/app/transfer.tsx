"use client";
import { Button } from "@/components/ui/button";
import useSendUsdc from "./hooks/useSendUsdc";

export default function Transfer() {
  const { sendUsdcAsync } = useSendUsdc();

  const onButtonClick = async () => {
    const res = await sendUsdcAsync();
    console.log(res);
  };

  return (
    <>
      <Button onClick={onButtonClick}>Send USDC</Button>
    </>
  );
}
