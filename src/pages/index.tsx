import { useState } from "react";
import { ethers } from "ethers";
import abi from "../lib/abi";

declare global { interface Window { ethereum?: any } }

/** MetaMask sağlayıcısını seç (Coinbase'i reddet) */
function getMetaMaskProvider(): any | null {
  const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
  if (!eth) return null;

  // EIP-6963: birden fazla sağlayıcı varsa
  if (Array.isArray(eth.providers) && eth.providers.length) {
    // isCoinbaseWallet olanları at
    const filtered = eth.providers.filter((p: any) => !p?.isCoinbaseWallet);
    const mm = filtered.find((p: any) => p?.isMetaMask && !p?.isBraveWallet);
    return mm ?? filtered[0] ?? null;
  }

  // Tek sağlayıcı varsa; Coinbase ise reddet
  if (eth.isCoinbaseWallet && !eth.isMetaMask) return null;
  return eth;
}

/** Base Sepolia (84532 = 0x14a34) ekleme/switch */
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
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string>("-");
  const [chainId, setChainId] = useState<string>("-");

  async function connectMetaMask() {
    try {
      setStatus("");
      const raw = getMetaMaskProvider();
      if (!raw) {
        setStatus("❌ MetaMask bulunamadı. (Diğer cüzdanları devre dışı bırakın, sadece MetaMask açık kalsın.)");
        return;
      }

      await raw.request({ method: "eth_requestAccounts" });
      await ensureBaseSepolia(raw);

      const provider = new ethers.BrowserProvider(raw);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const ch = await provider.send("eth_chainId", []);

      setAccount(addr);
      setChainId(ch);
      setConnected(true);
      setStatus(`✅ Bağlandı: ${addr.slice(0,6)}…${addr.slice(-4)} | chainId=${ch}`);
    } catch (e: any) {
      setStatus(`❌ Bağlantı hatası: ${e?.message || "unknown"}`);
      console.error(e);
    }
  }

  async function mint() {
    setBusy(true);
    setStatus("");
    try {
      if (!connected) { setStatus("❌ Önce MetaMask bağlayın."); return; }
      const raw = getMetaMaskProvider();
      if (!raw) { setStatus("❌ MetaMask yok."); return; }

      const provider = new ethers.BrowserProvider(raw);
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      const CONTRACT_ADDRESS = "0xF0FAD4DF546c8A04911DCC1ECE5043FbfE719791";
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

      setStatus(`📤 Gönderiliyor… from=${from}`);
      const tx = await contract.mintPOA();
      const rc = await tx.wait();
      setStatus(`✅ Mint OK. Block=${rc.blockNumber}`);
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

      {/* BUTONLAR ARTIK HER ZAMAN TIKLANABİLİR */}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={connectMetaMask} disabled={busy} style={{ padding: "10px 14px" }}>
          Connect MetaMask
        </button>
      </div>

      <div style={{ margin: "8px 0" }}>Account: {account} | chainId: {chainId}</div>

      <button onClick={mint} disabled={busy || !connected} style={{ padding: "12px 16px" }}>
        {busy ? "Processing..." : "Mint Attendance NFT"}
      </button>

      <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{status}</p>
    </div>
  );
}
