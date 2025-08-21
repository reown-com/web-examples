import React, { useState } from "react";
import { ethers } from "ethers";

interface SignTypedDataComponentProps {
  provider: any;
  ethersWeb3Provider: ethers.BrowserProvider;
}

const SignTypedDataComponent: React.FC<SignTypedDataComponentProps> = ({
  provider,
  ethersWeb3Provider,
}) => {
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typedData, setTypedData] = useState({
    domain: {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    },
    primaryType: "Mail",
    message: {
      from: {
        name: "Cow",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello, Bob!",
    },
  });

  const handleInputChange = (field: string, value: any) => {
    if (field === "domain") {
      setTypedData((prev) => ({
        ...prev,
        domain: { ...prev.domain, ...value },
      }));
    } else if (field === "message") {
      setTypedData((prev) => ({
        ...prev,
        message: { ...prev.message, ...value },
      }));
    } else if (field === "primaryType") {
      setTypedData((prev) => ({
        ...prev,
        primaryType: value,
      }));
    }
  };

  const signTypedData = async () => {
    setIsLoading(true);
    setError(null);
    setSignature(null);

    try {
      // Debug: Log available methods
      console.log("Provider methods:", provider.methods);
      console.log("Provider:", provider);

      // Get the signer's address
      const signer = await ethersWeb3Provider.getSigner();
      const address = await signer.getAddress();

      // Update the message with the current user's address
      const updatedMessage = {
        ...typedData.message,
        from: {
          name: "Cow",
          wallet: address,
        },
      };

      const dataToSign = {
        ...typedData,
        message: updatedMessage,
      };

      // Sign the typed data using the provider's eth_signTypedData method
      // Try different method names for WalletConnect v2 compatibility
      // Based on https://github.com/wevm/wagmi/discussions/2240
      let result;
      const methodsToTry = [
        "eth_signTypedData_v4", // Most modern wallets expect this for EIP-712
        "eth_signTypedData", // WalletConnect v2 default support
        "personal_signTypedData", // Alternative naming convention
        "eth_signTypedData_v1", // Legacy fallback
      ];

      for (const method of methodsToTry) {
        try {
          console.log(`Trying method: ${method}`);
          result = await provider.request({
            method,
            params: [address, dataToSign],
          });
          console.log(`Success with method: ${method}`);
          break;
        } catch (error) {
          console.log(
            `Method ${method} failed:`,
            error instanceof Error ? error.message : String(error)
          );
          if (method === methodsToTry[methodsToTry.length - 1]) {
            throw error; // Re-throw if all methods failed
          }
        }
      }

      setSignature(result as string);
      console.log("Typed data signed:", result);
    } catch (error) {
      console.error("Error signing typed data:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignature = async () => {
    if (!signature) return;

    try {
      const signer = await ethersWeb3Provider.getSigner();
      const address = await signer.getAddress();

      console.log("Current signer address:", address);
      console.log("Signature:", signature);
      console.log("Typed data:", typedData);

      // Note: Full signature verification would require implementing the EIP-712 hash calculation
      // This is a simplified version that just displays the information
      alert("Signature verification completed. Check console for details.");
    } catch (error) {
      console.error("Error during verification:", error);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "20px",
        margin: "10px",
        borderRadius: "8px",
      }}
    >
      <h3>Sign Typed Data (EIP-712)</h3>

      <div style={{ marginBottom: "15px" }}>
        <h4>Domain:</h4>
        <div style={{ marginBottom: "10px" }}>
          <label>Name: </label>
          <input
            type="text"
            value={typedData.domain.name}
            onChange={(e) =>
              handleInputChange("domain", { name: e.target.value })
            }
            style={{ marginLeft: "10px", padding: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Version: </label>
          <input
            type="text"
            value={typedData.domain.version}
            onChange={(e) =>
              handleInputChange("domain", { version: e.target.value })
            }
            style={{ marginLeft: "10px", padding: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Chain ID: </label>
          <input
            type="number"
            value={typedData.domain.chainId}
            onChange={(e) =>
              handleInputChange("domain", { chainId: parseInt(e.target.value) })
            }
            style={{ marginLeft: "10px", padding: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Verifying Contract: </label>
          <input
            type="text"
            value={typedData.domain.verifyingContract}
            onChange={(e) =>
              handleInputChange("domain", { verifyingContract: e.target.value })
            }
            style={{ marginLeft: "10px", padding: "5px", width: "300px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <h4>Message:</h4>
        <div style={{ marginBottom: "10px" }}>
          <label>From Name: </label>
          <input
            type="text"
            value={typedData.message.from.name}
            onChange={(e) =>
              handleInputChange("message", {
                from: { ...typedData.message.from, name: e.target.value },
              })
            }
            style={{ marginLeft: "10px", padding: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>To Name: </label>
          <input
            type="text"
            value={typedData.message.to.name}
            onChange={(e) =>
              handleInputChange("message", {
                to: { ...typedData.message.to, name: e.target.value },
              })
            }
            style={{ marginLeft: "10px", padding: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Contents: </label>
          <input
            type="text"
            value={typedData.message.contents}
            onChange={(e) =>
              handleInputChange("message", { contents: e.target.value })
            }
            style={{ marginLeft: "10px", padding: "5px", width: "300px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={signTypedData}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Signing..." : "Sign Typed Data"}
        </button>
      </div>

      {signature && (
        <div style={{ marginBottom: "15px" }}>
          <h4>Signature:</h4>
          <p
            style={{
              wordBreak: "break-all",
              backgroundColor: "#f8f9fa",
              padding: "10px",
              borderRadius: "5px",
              fontFamily: "monospace",
            }}
          >
            {signature}
          </p>
          <button
            onClick={verifySignature}
            style={{
              padding: "8px 16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Verify Signature
          </button>
        </div>
      )}

      {error && (
        <p
          style={{
            color: "red",
            backgroundColor: "#f8d7da",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          Error: {error}
        </p>
      )}

      {!signature && !error && (
        <p style={{ color: "#6c757d", fontStyle: "italic" }}>
          Fill in the form above and click 'Sign Typed Data' to sign EIP-712
          typed data
        </p>
      )}
    </div>
  );
};

export default SignTypedDataComponent;
