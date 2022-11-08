import type { AppProps } from "next/app";
import { createGlobalStyle } from "styled-components";

import { ClientContextProvider } from "../contexts/ClientContext";

import { globalStyle } from "../styles";
const GlobalStyle = createGlobalStyle`
  ${globalStyle}
`;

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <GlobalStyle />
      <ClientContextProvider>
        <Component {...pageProps} />
      </ClientContextProvider>
    </>
  );
}

export default MyApp;
