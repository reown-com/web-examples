import * as React from "react";
import { styled } from "styled-components";

interface SColumnStyleProps {
  $spanHeight: boolean;
  $maxWidth: number;
  $center: boolean;
}

interface ColumnProps {
  children: React.ReactNode;
  spanHeight?: boolean;
  maxWidth?: number;
  center?: boolean;
  className?: string;
}

const SColumn = styled.div<SColumnStyleProps>`
  position: relative;
  width: 100%;
  height: ${({ $spanHeight }) => ($spanHeight ? "100%" : "auto")};
  max-width: ${({ $maxWidth }) => `${$maxWidth}px`};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: ${({ $center }) => ($center ? "center" : "flex-start")};
`;

const Column = ({
  children,
  spanHeight = false,
  maxWidth = 600,
  center = false,
  className,
}: ColumnProps) => (
  <SColumn
    $spanHeight={spanHeight}
    $maxWidth={maxWidth}
    $center={center}
    className={className}
  >
    {children}
  </SColumn>
);

export default Column;
