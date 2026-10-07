import React from "react";
import { styled } from "styled-components";
import { colors, transitions } from "../styles";

interface LightboxStyleProps {
  $show: boolean;
  $opacity?: number;
}

const SLightbox = styled.div<LightboxStyleProps>`
  transition: opacity 0.1s ease-in-out;
  text-align: center;
  /* Cover the viewport, so the card is centered on screen even on a long page */
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 2;
  will-change: opacity;
  background-color: ${({ $opacity }) => {
    let alpha = 0.4;
    if (typeof $opacity === "number") {
      alpha = $opacity;
    }
    return `rgba(0, 0, 0, ${alpha})`;
  }};
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  visibility: ${({ $show }) => ($show ? "visible" : "hidden")};
  pointer-events: ${({ $show }) => ($show ? "auto" : "none")};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SModalContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface HitboxProps {
  onClick?: () => void;
}

const SHitbox = styled.div<HitboxProps>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

interface CloseButtonStyleProps {
  $size: number;
  $color: string;
}

const SCloseButton = styled.div<CloseButtonStyleProps>`
  transition: ${transitions.short};
  position: absolute;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  right: ${({ $size }) => `${$size / 1.6667}px`};
  top: ${({ $size }) => `${$size / 1.6667}px`};
  opacity: 0.5;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
  &:before,
  &:after {
    position: absolute;
    content: " ";
    height: ${({ $size }) => `${$size}px`};
    width: 2px;
    background: ${({ $color }) => `rgb(${colors[$color]})`};
  }
  &:before {
    transform: rotate(45deg);
  }
  &:after {
    transform: rotate(-45deg);
  }
`;

const SCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  padding: 25px;
  background-color: rgb(${colors.white});
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const SModalContent = styled.div`
  position: relative;
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

interface IProps {
  children: React.ReactNode;
  show: boolean;
  closeModal: () => void;
  opacity?: number;
}

export default function Modal({ children, show, opacity, closeModal }: IProps) {
  return (
    <SLightbox $show={show} $opacity={opacity}>
      <SModalContainer>
        <SHitbox onClick={closeModal} />
        <SCard>
          <SCloseButton $size={25} $color="dark" onClick={closeModal} />
          <SModalContent>{children}</SModalContent>
        </SCard>
      </SModalContainer>
    </SLightbox>
  );
}
