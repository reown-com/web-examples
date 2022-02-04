import * as React from "react";
import * as ReactDOM from "react-dom";
import { createGlobalStyle } from "styled-components";
import { ClientContextProvider } from "./contexts/ClientContext";
import { JsonRpcContextProvider } from "./contexts/JsonRpcContext";

import HooksApp from "./HooksApp";
import { globalStyle } from "./styles";
const GlobalStyle = createGlobalStyle`
  ${globalStyle}
`;

declare global {
  // tslint:disable-next-line
  interface Window {
    blockies: any;
  }
}

ReactDOM.render(
  <>
    <GlobalStyle />
    <ClientContextProvider>
      <JsonRpcContextProvider>
        <HooksApp />
      </JsonRpcContextProvider>
    </ClientContextProvider>
  </>,
  document.getElementById("root"),
);
