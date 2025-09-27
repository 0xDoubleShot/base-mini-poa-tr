import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import abi from "../lib/abi";

declare global { interface Window { ethereum?: any } }

type ProviderChoice = "metamask";

function getAllProviders(): any[] {
  const eth = (typeof window !== "undefined" ? window.ethereum : undefined) as any;
  if (!eth) return [];
  if (Array.isArray(eth.providers)) return eth.providers;
  return [eth].filter(Boolean);
}
function pickProvider(choice: ProviderChoice) {
  const list = getAllProviders();
  // Coinbase sağlayıcılarını tamamen hariç tut
  const filtered = list.filter((p) => !p?.isCoinbaseWallet);
  if (choice === "metamask") return filtered.find((p) => p?.isMetaMask && !p?.isBraveWallet) ?? null;
  return null;
}
async function ensureBaseSepolia(raw: any) {
  const chainHex = "0x14a34"; // 84532
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
  const [providerInfo, setProviderInfo] = useState<any[]>([]);

  const provFlags = useMemo(() => {
    const list = getAllProviders();
    setProviderInfo(list.map(p => ({
      isMetaMask: !!p?.isMetaMask,
      isCoinbaseWallet: !!p?.isCoinbaseWallet,
      isRabby: !!p?.isRabby
    })));
    return {
      hasMetaMask: !!list.find((p) => p?.isMetaMask && !p?.isBraveWallet),
      onlyCoinbase: list.length > 0 && list.every((p) => p?.isCoinbaseWallet),
      count: list.length
    };
  }, []);

  useEffect(() => {
    if (provFlags.onlyCoinbase) {
      setStatus("⚠️ Sadece Coinbase provider algılandı. Lütfen uzantıyı devre dışı bırakıp sadece MetaMask ile deneyin.");
    }
  }, [provFlags.onlyCoinbase]);

  async function connectMetaMask() {
    try {
      setStatus("");
      const raw = pickProvider("metamask");
      if (!raw) {
        setStatus("❌ MetaMask bulunamadı. (Diğer cüzdanları devre dışı bırakın ve sayfayı yenileyin.)");
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
    } catch (e:any) {
      setStatus(`❌ Bağlantı hatası: ${e?.message || "unknown"}`);
      console.error(e);
    }
  }

  async function mint() {
    setStatus("");
    setBusy(true);
    try {
      if (!connected) { setStatus("❌ Önce MetaMask bağlayın."); return; }
      const raw = pickProvider("metamask");
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
    } catch (e:any) {
      setStatus(`❌ Hata: ${e?.message || e?.error?.message || "unknown"}`);
      console.error(e);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Base Mini App — Proof of Attendance</h1>
      <p>Click the button to mint your Attendance NFT on Base Sepolia.</p>

      <div style={{margin:"8px 0", fontSize:14}}>
        <div>Detected providers: {provFlags.count}</div>
        <pre style={{background:"#f6f6f6", padding:8}}>
{JSON.stringify(providerInfo, null, 2)}
        </pre>
      </div>

      <button onClick={connectMetaMask} disabled={busy} style={{ padding: "10px 14px", marginRight: 8 }}>
        Connect MetaMask
      </button>

      <div style={{ margin: "8px 0" }}>Account: {account} | chainId: {chainId}</div>

      <button onClick={mint} disabled={!connected || busy} style={{ padding: "12px 16px" }}>
        {busy ? "Processing..." : "Mint Attendance NFT"}
      </button>

      <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{status}</p>
    </div>
  );
}
