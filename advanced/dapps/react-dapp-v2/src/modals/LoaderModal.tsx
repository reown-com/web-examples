import * as React from "react";

import Loader from "../components/Loader";
import { SContainer } from "../components/shared";

import { SModalContainer, SModalParagraph, SModalTitle } from "./shared";

interface LoaderModal {
  title: string;
  text?: string;
  subtitle?: string;
  isError?: boolean;
}

const LoaderModal = (props: LoaderModal) => {
  const { title, text, subtitle, isError } = props;
  return (
    <>
      <SModalContainer>
        <SModalTitle>{title}</SModalTitle>
        <SContainer>
          {!isError && <Loader />}
          {!isError && <br />}
          {text && <SModalParagraph>{text}</SModalParagraph>}
          {subtitle && <SModalParagraph>{subtitle}</SModalParagraph>}
        </SContainer>
      </SModalContainer>
    </>
  );
};

export default LoaderModal;
