import * as React from "react";

import Loader from "../components/Loader";
import { SContainer } from "../components/shared";

import { SModalContainer, SModalParagraph, SModalTitle } from "./shared";

interface LoaderModal {
  title: string;
  text?: string;
}

const LoaderModal = (props: LoaderModal) => {
  const { title, text } = props;
  return (
    <>
      <SModalContainer>
        <SModalTitle>{title}</SModalTitle>
        <SContainer>
          <Loader />
          <br />
          <SModalParagraph>{text}</SModalParagraph>
        </SContainer>
      </SModalContainer>
    </>
  );
};

export default LoaderModal;
