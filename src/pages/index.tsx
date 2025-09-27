import { useState } from "react";
import { ethers } from "ethers";
import abi from "../lib/abi";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/** Uygun sağlayıcıyı (MetaMask/Rabby) seç */
function pickEOAProvider(): any {
  const eth = window.ethereum as any;
  if (!eth) return null;

  // EIP-6963 / multiple providers
  if (Array.isArray(eth.providers) && eth.providers.length) {
    // Öncelik: Rabby → MetaMask
    const rabby = eth.providers.find((p: any) => p?.isRabby);
    if (rabby) return rabby;
    const metamask = eth.providers.find((p: any) => p?.isMetaMask);
    if (metamask) return metamask;
    // Coinbase internal vs classic ayrımı yoksa EOA olmayanı ele
    const nonCBW = eth.providers.find((p: any) => !p?.isCoinbaseWallet);
    if (nonCBW) return nonCBW;
    return eth.providers[0];
  }

  // Tek sağlayıcı durumda: MetaMask/Rabby tercih et, Coinbase ise uyar
  if (eth.isCoinbaseWallet && !eth.isMetaMask && !eth.isRabby) {
    return null; // internal account'a düşmeyelim
  }
  return eth;
}

/** Base Sepolia (84532 = 0x14a34) ekleme/switch */
async function ensureBaseSepolia(rawProvider: any) {
  const chainHex = "0x14a34";
  try {
    const cur = await rawProvider.request({ method: "eth_chainId" });
    if (cur?.toLowerCase() === chainHex) return;
    await rawProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }]
    });
  } catch (err: any) {
    // ekli değilse
    await rawProvider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainHex,
        chainName: "Base Sepolia",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia.base.org"],
        blockExplorerUrls: ["https://sepolia.basescan.org"]
      }]
    });
    await rawProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }]
    });
  }
}

export default function Home() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function mint() {
    setStatus("");
    setBusy(true);
    try {
      const raw = pickEOAProvider();
      if (!raw) {
        setStatus("❌ Lütfen MetaMask veya Rabby (EOA) kullan. Coinbase Smart Wallet internal account ile contract çağrısı engellenir.");
        return;
      }

      await raw.request({ method: "eth_requestAccounts" });
      await ensureBaseSepolia(raw);

      const provider = new ethers.BrowserProvider(raw);
      const signer = await provider.getSigner();

      const CONTRACT_ADDRESS = "0xF0FAD4DF546c8A04911DCC1ECE5043FbfE719791";
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

      setStatus("📤 İşlem gönderiliyor…");
      const tx = await contract.mintPOA();
      setStatus(`⏳ Onay bekleniyor… (tx: ${tx.hash.slice(0, 10)}...)`);
      const receipt = await tx.wait();
      setStatus(`✅ Mint başarılı! Block: ${receipt.blockNumber}`);
    } catch (e: any) {
      const msg = e?.message || e?.error?.message || "unknown error";
      setStatus(`❌ Hata: ${msg}`);
      console.error(e);
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
        style={{ padding: "12px 16px", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "Processing..." : "Mint Attendance NFT"}
      </button>
      <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{status}</p>
    </div>
  );
}
