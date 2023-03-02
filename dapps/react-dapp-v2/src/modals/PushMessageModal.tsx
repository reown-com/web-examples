import * as React from "react";

import Loader from "../components/Loader";
import { SContainer } from "../components/shared";

import { SModalContainer, SModalTitle } from "./shared";

interface PushMessageModal {
  pending: boolean;
}

const PushMessageModal = (props: PushMessageModal) => {
  const { pending } = props;
  return (
    <SModalContainer>
      <SModalTitle>
        {pending ? "Pending Push Message ⏳" : "Push Message Sent ✅"}
      </SModalTitle>
      {pending ? (
        <SContainer>
          <Loader />
        </SContainer>
      ) : null}
    </SModalContainer>
  );
};

export default PushMessageModal;
