import * as React from "react";
import styled from "styled-components";
import Icon from "./Icon";
import { useState } from "react";

interface DropdownProps {
  castAccounts: string[];
  setCastAccounts: React.Dispatch<React.SetStateAction<string[]>>;
}

const CastConfigContainer = styled.div`
  position: fixed;
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-contenet: flex-start;
  top: 64px;
  width: 60%;
  color: black;
  background: white;
  border: 1px solid #cccccc;
  border-radius: 4px;
  padding: 16px;

  @media screen and (max-width: 768px) {
    top: 88px;
    width: 80%;
    margin-left: 200px;
  }
`;

const CastAccountsInput = styled.input`
  padding: 0.5em;
  margin: 0.5em;
  color: black;
  background: transparent;
  border: 1px solid black;
  border-radius: 3px;
`;

const CastConfigDropdown = (props: DropdownProps) => {
  const { castAccounts, setCastAccounts } = props;
  const [openSelect, setOpenSelect] = useState(false);

  const toggleDropdown = () => {
    setOpenSelect(!openSelect);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <button onClick={toggleDropdown} style={{ background: "transparent" }}>
        <Icon size={30} src={"/assets/settings.svg"} />
      </button>
      {openSelect && (
        <CastConfigContainer>
          <label htmlFor="castAddresses" style={{ fontWeight: "bold" }}>
            CAIP-10 Cast Accounts (comma-separated)
          </label>
          <CastAccountsInput
            type="text"
            name="castAddresses"
            placeholder="eip155:1:0xab..., eip155:1:0xcd..."
            value={castAccounts.join(",")}
            onChange={(evt) => {
              const castAccountsString = evt?.target?.value;
              const castAccounts = castAccountsString
                .split(",")
                .map((s) => s.trim());
              setCastAccounts(castAccounts);
              console.log("[PUSH DEMO] Set castAccounts as", castAccounts);
            }}
          />
        </CastConfigContainer>
      )}
    </div>
  );
};

export default CastConfigDropdown;
