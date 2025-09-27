import { useState } from "react";
import { ethers } from "ethers";
import abi from "../lib/abi";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Home() {
  const [status, setStatus] = useState<string>("");

  async function mint() {
    try {
      if (!window.ethereum) {
        setStatus("Metamask not found");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        "0xYOUR_DEPLOYED_ADDRESS", // deploy sonrası güncelle
        abi,
        signer
      );

      const tx = await contract.mintPOA();
      setStatus("Submitting transaction...");
      await tx.wait();
      setStatus("✅ Mint successful!");
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Error: ${err?.message ?? "unknown"}`);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Base Mini App — Proof of Attendance</h1>
      <p>Click the button to mint your Attendance NFT on Base Sepolia.</p>
      <button onClick={mint} style={{ padding: 12, cursor: "pointer" }}>
        Mint Attendance NFT
      </button>
      <p style={{ marginTop: 12 }}>{status}</p>
    </div>
  );
}

