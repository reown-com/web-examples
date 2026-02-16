import * as React from "react";
import styled from "styled-components";

import { colors, transitions } from "../styles";

interface IToggleStyleProps {
  $color: string;
  $active: boolean;
}

const SToggle = styled.div<IToggleStyleProps>`
  position: relative;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  transition: ${transitions.base};
  & div {
    transition: ${transitions.base};
    appearance: none;
    transition: all 0.3s ease;
    box-shadow: ${({ $active, $color }) =>
      $active
        ? `inset 0px 0px 0px 20px rgb(${colors[$color]})`
        : `inset 0px 0px 0px 1px rgb(${colors.grey})`};
    border-radius: 1rem;
    background-color: rgb(${colors.white});
    padding: 1px;
    display: inline-block;
    width: 46px;
    height: 26px;
    position: relative;
    cursor: pointer;
    margin: 0px;
    vertical-align: bottom;
    outline: none;
    border: none;
  }
  & div:after {
    transition: ${transitions.base};
    box-shadow: inset 0 1px 0 rgb(${colors.grey}),
      0px 2px 2px 1px rgba(${colors.black}, 0.2);
    border-radius: 1rem;
    left: ${({ $active }) => ($active ? `20px` : `0`)};
    content: "";
    position: absolute;
    width: 24px;
    height: 24px;
    cursor: pointer;
    background-color: rgb(${colors.white});
  }
`;

interface IToggleProps {
  active?: boolean;
  color?: string;
  onClick?: () => void;
}

const Toggle = ({ active = false, color = "green", onClick }: IToggleProps) => (
  <SToggle $color={color} $active={active} onClick={onClick}>
    <div />
  </SToggle>
);

export default Toggle;
