import * as React from "react";
import * as PropTypes from "prop-types";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

interface WrapperStyleProps {
  center: boolean;
}

const SWrapper = styled.div<WrapperStyleProps>`
  will-change: transform, opacity;
  animation: ${fadeIn} 0.7s ease 0s normal 1;
  min-height: 200px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: ${({ center }) => (center ? `center` : `flex-start`)};
`;

interface WrapperProps extends WrapperStyleProps {
  children: React.ReactNode;
}

const Wrapper = (props: WrapperProps) => {
  const { children, center } = props;
  return (
    <SWrapper {...props} center={center}>
      {children}
    </SWrapper>
  );
};

Wrapper.propTypes = {
  children: PropTypes.node.isRequired,
  center: PropTypes.bool,
};

Wrapper.defaultProps = {
  center: false,
};

export default Wrapper;
