import { useState } from "react";
import { ethers } from "ethers";
import abi from "../lib/abi";

// window.ethereum tipi
declare global {
  interface Window {
    ethereum?: any;
  }
}

/** Base Sepolia ağı ekleme/switch helper (84532 = 0x14a34) */
async function ensureBaseSepolia(provider: ethers.BrowserProvider) {
  const targetChainId = 84532;
  const targetChainHex = "0x14a34";

  // Mevcut ağ
  const network = await provider.getNetwork();
  if (Number(network.chainId) === targetChainId) return;

  // Switch dene, yoksa ekle
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: targetChainHex }]);
  } catch (switchErr: any) {
    // 4902 vb. ekli değil: ağ ekle
    await provider.send("wallet_addEthereumChain", [
      {
        chainId: targetChainHex,
        chainName: "Base Sepolia",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia.base.org"],
        blockExplorerUrls: ["https://sepolia.basescan.org"]
      }
    ]);
    // ekledikten sonra tekrar switch
    await provider.send("wallet_switchEthereumChain", [{ chainId: targetChainHex }]);
  }
}

export default function Home() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function mint() {
    setStatus("");
    setBusy(true);

    try {
      if (!window.ethereum) {
        setStatus("❌ Cüzdan bulunamadı (Metamask/Rabby).");
        return;
      }

      // EOA kullan (MetaMask/Rabby). Coinbase Smart Wallet ile contract data gönderilemez.
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      await ensureBaseSepolia(provider);

      const signer = await provider.getSigner();

      // Kontrat (senin deploy adresin)
      const CONTRACT_ADDRESS = "0xF0FAD4DF546c8A04911DCC1ECE5043FbfE719791";
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

      // İşlem gönder
      setStatus("📤 İşlem gönderiliyor…");
      const tx = await contract.mintPOA(); // gas ayarı otomatik
      setStatus(`⏳ Onay bekleniyor… (tx: ${tx.hash.slice(0, 10)}...)`);
      const receipt = await tx.wait();

      setStatus(`✅ Mint başarılı! Block: ${receipt.blockNumber}`);
    } catch (err: any) {
      // Coinbase Smart Wallet/internal account hatası veya user reject vb.
      const msg =
        err?.message ||
        err?.error?.message ||
        (typeof err === "string" ? err : "unknown error");
      setStatus(`❌ Hata: ${msg}`);
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Base Mini App — Proof of Attendance</h1>
      <p>Click the button to mint your Attendance NFT on Base Sepolia.</p>

      <button
        onClick={mint}
        disabled={busy}
        style={{
          padding: "12px 16px",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1
        }}
      >
        {busy ? "Processing..." : "Mint Attendance NFT"}
      </button>

      <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{status}</p>
    </div>
  );
}
