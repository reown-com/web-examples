import * as React from "react";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

interface SWrapperStyleProps {
  $center: boolean;
}

const SWrapper = styled.div<SWrapperStyleProps>`
  will-change: transform, opacity;
  animation: ${fadeIn} 0.7s ease 0s normal 1;
  min-height: 200px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: ${({ $center }) => ($center ? `center` : `flex-start`)};
`;

interface WrapperProps {
  children: React.ReactNode;
  center?: boolean;
  className?: string;
}

const Wrapper = ({ children, center = false, className }: WrapperProps) => (
  <SWrapper $center={center} className={className}>{children}</SWrapper>
);

export default Wrapper;
