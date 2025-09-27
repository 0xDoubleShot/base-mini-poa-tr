import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import abi from "../lib/abi";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type ProviderChoice = "metamask" | "rabby" | null;

// Tüm provider'ları topla (EIP-6963 uyumlu)
function getAllProviders(): any[] {
  const eth = (typeof window !== "undefined" ? window.ethereum : undefined) as any;
  if (!eth) return [];
  if (Array.isArray(eth.providers)) return eth.providers;
  return [eth].filter(Boolean);
}

// Seçime göre provider getir
function pickProvider(choice: ProviderChoice) {
  const list = getAllProviders();
  if (!list.length) return null;
  if (choice === "rabby") return list.find((p) => p?.isRabby) ?? null;
  if (choice === "metamask") return list.find((p) => p?.isMetaMask && !p?.isBraveWallet) ?? null;
  return null;
}

// Base Sepolia (84532 = 0x14a34) ekleme/switch
async function ensureBaseSepolia(raw: any) {
  const chainHex = "0x14a34";
  try {
    const cur = await raw.request({ method: "eth_chainId" });
    if (cur?.toLowerCase() === chainHex) return;
    await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  } catch {
    await raw.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainHex,
        chainName: "Base Sepolia",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia.base.org"],
        blockExplorerUrls: ["https://sepolia.basescan.org"]
      }]
    });
    await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  }
}

export default function Home() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<ProviderChoice>(null);
  const [connected, setConnected] = useState(false);

  const providers = useMemo(() => {
    const ps = getAllProviders();
    return {
      hasMetaMask: !!ps.find((p) => p?.isMetaMask && !p?.isBraveWallet),
      hasRabby: !!ps.find((p) => p?.isRabby),
      onlyCoinbase: ps.length > 0 && ps.every((p) => p?.isCoinbaseWallet)
    };
  }, []);

  useEffect(() => {
    if (providers.onlyCoinbase) {
      setStatus("⚠️ Coinbase Smart Wallet (internal) algılandı. Lütfen MetaMask veya Rabby kullanın (EOA).");
    }
  }, [providers.onlyCoinbase]);

  async function connectWallet(target: ProviderChoice) {
    try {
      setStatus("");
      const raw = pickProvider(target);
      if (!raw) {
        setStatus("❌ Seçtiğiniz cüzdan bulunamadı. MetaMask veya Rabby yükleyin.");
        return;
      }
      await raw.request({ method: "eth_requestAccounts" });
      await ensureBaseSepolia(raw);
      setChoice(target);
      setConnected(true);
      setStatus("✅ Cüzdan bağlandı ve Base Sepolia seçildi.");
    } catch (e: any) {
      setStatus(`❌ Bağlantı hatası: ${e?.message || "unknown"}`);
      console.error(e);
    }
  }

  async function mint() {
    setStatus("");
    setBusy(true);
    try {
      if (!connected || !choice) {
        setStatus("❌ Önce cüzdan seçip bağlayın.");
        return;
      }
      const raw = pickProvider(choice);
      if (!raw) {
        setStatus("❌ Cüzdan bulunamadı.");
        return;
      }
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
      setStatus(`❌ Hata: ${e?.message || e?.error?.message || "unknown"}`);
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Base Mini App — Proof of Attendance</h1>
      <p>Click the button to mint your Attendance NFT on Base Sepolia.</p>

      <div style={{ margin: "12px 0", display: "flex", gap: 8 }}>
        <button
          onClick={() => connectWallet("metamask")}
          disabled={!providers.hasMetaMask || busy}
          title={providers.hasMetaMask ? "Connect MetaMask" : "MetaMask not detected"}
          style={{ padding: "10px 14px" }}
        >
          Connect MetaMask
        </button>
        <button
          onClick={() => connectWallet("rabby")}
          disabled={!providers.hasRabby || busy}
          title={providers.hasRabby ? "Connect Rabby" : "Rabby not detected"}
          style={{ padding: "10px 14px" }}
        >
          Connect Rabby
        </button>
      </div>

      <button
        onClick={mint}
        disabled={!connected || busy}
        style={{ padding: "12px 16px", cursor: (!connected || busy) ? "not-allowed" : "pointer", opacity: (!connected || busy) ? 0.7 : 1 }}
      >
        {busy ? "Processing..." : "Mint Attendance NFT"}
      </button>

      <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{status}</p>
    </div>
  );
}
