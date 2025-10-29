// =========================================================
//  server.js — versi hybrid (Vercel + lokal)
// =========================================================

// 1. Core Dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// 2. Blockchain and Database Libraries
const { ethers } = require('ethers');
const supabase = require('../config/supabase'); // pastikan path ini sesuai

// 3. Project Configurations
const { CROWDSALE_ABI } = require('../config/contractConfig');
const { DEFAULT_ADMIN_THEME, DEFAULT_SITE_CONTENT } = require('../config/themeConfig'); 

// 4. Import Middleware
const isAdmin = require('../middleware/auth'); 

// 5. Load Environment Variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// =========================================================
// === CORS Configuration ===
// =========================================================
const allowedOrigins = [
  'http://localhost:3000', // Admin Panel Dev
  'http://localhost:3001', // Public Site Dev
  process.env.ADMIN_PANEL_URL,
  process.env.PUBLIC_SITE_URL,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server request
    if (allowedOrigins.includes(origin)) callback(null, true);
    else {
      console.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}));

app.use(express.json());

// =========================================================
// === Ethers.js Setup ===
// =========================================================
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);

const crowdsaleContract = new ethers.Contract(
  process.env.CROWDSALE_ADDRESS,
  CROWDSALE_ABI,
  signer
);
const crowdsaleReader = new ethers.Contract(
  process.env.CROWDSALE_ADDRESS,
  CROWDSALE_ABI,
  provider
);

// =========================================================
// === ADMIN API ===
// =========================================================

// Tambah ke whitelist
app.post('/api/admin/whitelist/add', isAdmin, async (req, res) => {
  const { account } = req.body;
  if (!account || !ethers.isAddress(account))
    return res.status(400).json({ error: 'Alamat Ethereum tidak valid.' });

  try {
    const isOnChain = await crowdsaleReader.isWhitelisted(account);
    if (isOnChain) return res.json({ success: true, message: 'Alamat sudah terdaftar di Smart Contract.' });

    console.log(`[ON-CHAIN TX] addToWhitelist: ${account}`);
    const tx = await crowdsaleContract.addToWhitelist(account);
    const receipt = await tx.wait();

    if (receipt.status === 0) throw new Error("Transaksi dibatalkan di blockchain.");

    const { error: updateError } = await supabase
      .from('whitelist_status')
      .upsert({
        user_address: account.toLowerCase(),
        is_whitelisted_on_chain: true,
        whitelisted_at: new Date().toISOString(),
      }, { onConflict: 'user_address' });

    if (updateError) console.error("DB update gagal:", updateError);

    res.json({
      success: true,
      message: `Alamat ${account} berhasil ditambahkan ke Whitelist.`,
      txHash: receipt.hash
    });

  } catch (error) {
    console.error("Kesalahan Whitelist:", error);
    res.status(500).json({
      error: 'Gagal memproses transaksi Whitelist.',
      details: error.reason || error.message
    });
  }
});

// Statistik dashboard admin
app.get('/api/admin/stats', isAdmin, async (req, res) => {
  try {
    const { count: whitelistCount } = await supabase
      .from('whitelist_status')
      .select('*', { count: 'exact', head: true });

    const { data: latestTxs } = await supabase
      .from('transactions')
      .select('tx_hash, user_address, eth_amount, token_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    const hardcapWei = await crowdsaleReader.cap();
    const softcapWei = crowdsaleReader.softCap ? await crowdsaleReader.softCap() : ethers.parseEther("0");

    res.json({
      whitelistCount: whitelistCount || 0,
      transactionCount: txCount || 0,
      latestTransactions: latestTxs || [],
      hardcapEth: ethers.formatEther(hardcapWei),
      softcapEth: ethers.formatEther(softcapWei),
    });
  } catch (error) {
    console.error("Gagal memuat statistik admin:", error);
    res.status(500).json({ error: 'Gagal memuat statistik admin.' });
  }
});

// =========================================================
// === PUBLIC API ===
// =========================================================

// Total dana terkumpul
app.get('/api/public/weiraised', async (req, res) => {
  try {
    const weiRaised = await crowdsaleReader.weiRaised();
    res.json({ ethRaised: ethers.formatEther(weiRaised) });
  } catch (error) {
    console.error("Kesalahan mendapatkan weiRaised:", error);
    res.status(500).json({ error: 'Gagal mengambil total dana terkumpul.' });
  }
});

// Status whitelist
app.get('/api/public/whitelist-status/:address', async (req, res) => {
  try {
    const address = req.params.address;
    if (!ethers.isAddress(address))
      return res.status(400).json({ error: 'Alamat tidak valid.' });
    const status = await crowdsaleReader.isWhitelisted(address);
    res.json({ isWhitelisted: status });
  } catch (error) {
    console.error("Kesalahan whitelist:", error);
    res.status(500).json({ error: 'Gagal mengambil status whitelist.' });
  }
});

// Konfigurasi tema & konten
app.get('/api/public/site-settings', async (req, res) => {
  try {
    let siteContent = DEFAULT_SITE_CONTENT;
    const { data } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'site_content')
      .single();

    if (data && data.setting_value) siteContent = data.setting_value;

    res.json({
      theme: DEFAULT_ADMIN_THEME,
      content: siteContent
    });
  } catch (error) {
    console.error("Gagal memuat konfigurasi situs:", error);
    res.status(500).json({ error: 'Gagal memuat konfigurasi situs.' });
  }
});

// =========================================================
// === START SERVER (Hybrid Mode) ===
// =========================================================

// Jika di Vercel → ekspor app
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Jika dijalankan lokal
  app.listen(port, () => {
    console.log(`🚀 Server lokal berjalan di http://localhost:${port}`);
    console.log(`👤 Owner Wallet: ${signer.address}`);
    console.log(`📜 Smart Contract: ${process.env.CROWDSALE_ADDRESS}`);
  });
}
