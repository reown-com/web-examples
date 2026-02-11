import * as React from "react";
import styled from "styled-components";

interface SIconStyleProps {
  $size: number;
}

const SIcon = styled.img<SIconStyleProps>`
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
`;

interface IconProps {
  src?: string | null;
  fallback?: string;
  size?: number;
}

const Icon = ({ src = null, fallback = "", size = 20 }: IconProps) => (
  <SIcon
    src={src || undefined}
    $size={size}
    onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback) {
        event.currentTarget.src = fallback;
      }
    }}
  />
);

export default Icon;
