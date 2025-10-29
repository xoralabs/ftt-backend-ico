// server.js

// 1. Core Dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// 2. Blockchain and Database Libraries
const { ethers } = require('ethers');
const supabase = require('./config/supabase'); // Supabase client connection

// 3. Project Configurations
const { CROWDSALE_ABI } = require('./config/contractConfig');
const { DEFAULT_ADMIN_THEME, DEFAULT_SITE_CONTENT } = require('./config/themeConfig'); 

// 4. Import Middleware
const isAdmin = require('./middleware/auth'); 

// 5. Load Environment Variables from .env
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// --- CORS Configuration (Hanya mengizinkan domain Frontend Anda) ---
const allowedOrigins = [
    // Tambahkan domain Admin Panel dan situs publik yang akan berkomunikasi
    'http://localhost:3000', // Admin Panel Development (Port default Next.js)
    'http://localhost:3001', // Public Site Development (Jika ada)
    // process.env.ADMIN_PANEL_URL, // Domain Produksi Admin Panel
    // process.env.PUBLIC_SITE_URL, // Domain Produksi Situs Publik
];

app.use(cors({
    origin: (origin, callback) => {
        // Izinkan request tanpa 'origin' (misalnya server-to-server, Postman)
        if (!origin) return callback(null, true); 
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS policy'), false);
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'], // WAJIB: Izinkan header kustom X-API-Key
}));

app.use(express.json()); 

// --- Ethers.js Setup ---
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);

// Kontrak Crowdsale yang terhubung dengan Signer (untuk fungsi Tulis)
const crowdsaleContract = new ethers.Contract(
    process.env.CROWDSALE_ADDRESS,
    CROWDSALE_ABI,
    signer 
);

// Kontrak Crowdsale yang hanya terhubung dengan Provider (untuk fungsi Baca)
const crowdsaleReader = new ethers.Contract(
    process.env.CROWDSALE_ADDRESS,
    CROWDSALE_ABI,
    provider
);

// =========================================================
// === 1. ADMIN API (PROTECTED ENDPOINTS) ===
// =========================================================

// Endpoint untuk menambahkan alamat ke Whitelist
app.post('/api/admin/whitelist/add', isAdmin, async (req, res) => {
    const { account } = req.body; 

    if (!account || !ethers.isAddress(account)) {
        return res.status(400).json({ error: 'Alamat Ethereum tidak valid.' });
    }

    try {
        // ... (Logika Validasi, Transaksi On-Chain, dan Pembaruan Supabase) ...
        const isOnChain = await crowdsaleReader.isWhitelisted(account);
        if (isOnChain) {
            return res.json({ success: true, message: 'Alamat sudah terdaftar di Smart Contract.' });
        }
        
        console.log(`[ON-CHAIN TX] Mengirim addToWhitelist untuk: ${account}`);
        const tx = await crowdsaleContract.addToWhitelist(account);
        const receipt = await tx.wait(); 

        if (receipt.status === 0) {
             throw new Error("Transaksi dibatalkan di blockchain.");
        }

        const { error: updateError } = await supabase
            .from('whitelist_status')
            .upsert({ 
                user_address: account.toLowerCase(), 
                is_whitelisted_on_chain: true, 
                whitelisted_at: new Date().toISOString() 
            }, { onConflict: 'user_address' });

        if (updateError) {
            console.error("Gagal update status Whitelist di DB:", updateError);
        }

        res.json({ 
            success: true, 
            message: `Alamat ${account} berhasil ditambahkan ke Whitelist.`, 
            txHash: receipt.hash 
        });

    } catch (error) {
        console.error("Kesalahan proses Whitelist:", error);
        res.status(500).json({ 
            error: 'Gagal memproses transaksi Whitelist.', 
            details: error.reason || error.message 
        });
    }
});

// Endpoint BARU untuk mendapatkan statistik Dashboard (Whitelist, Transaksi, Cap)
app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        // A. Total Whitelisted Users
        const { count: whitelistCount } = await supabase
            .from('whitelist_status')
            .select('*', { count: 'exact', head: true });

        // B. Fetch 5 Transaksi Terbaru (asumsi tabel 'transactions' ada)
        const { data: latestTxs } = await supabase
            .from('transactions')
            .select('tx_hash, user_address, eth_amount, token_amount, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        // C. Total Jumlah Transaksi
        const { count: txCount } = await supabase
             .from('transactions')
             .select('*', { count: 'exact', head: true });

        // D. Ambil Hardcap dan Softcap dari SC 
        const hardcapWei = await crowdsaleReader.cap();
        const softcapWei = await crowdsaleReader.softCap ? await crowdsaleReader.softCap() : ethers.parseEther("0"); 
        
        const hardcapEth = ethers.formatEther(hardcapWei);
        const softcapEth = ethers.formatEther(softcapWei);
        
        res.json({
            whitelistCount: whitelistCount || 0,
            transactionCount: txCount || 0,
            latestTransactions: latestTxs || [],
            hardcapEth: hardcapEth, 
            softcapEth: softcapEth,
        });
    } catch (error) {
        console.error("Gagal memuat statistik admin:", error);
        res.status(500).json({ error: 'Gagal memuat statistik admin dari Smart Contract atau Database.' });
    }
});


// Endpoint untuk mengunggah aset situs (saat ini dinonaktifkan)
app.post('/api/admin/site/asset/upload', isAdmin, (req, res) => { 
    res.status(501).json({ error: 'Fungsionalitas upload aset saat ini dinonaktifkan.' });
});


// Endpoint untuk menyimpan semua pengaturan teks situs
app.post('/api/admin/site/content/save', isAdmin, async (req, res) => {
    const newContent = req.body.content; 
    if (!newContent) {
        return res.status(400).json({ error: 'Data konten tidak boleh kosong.' });
    }

    try {
        const { error: dbError } = await supabase
            .from('site_settings')
            .upsert({ 
                setting_key: 'site_content', 
                setting_value: newContent,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' });

        if (dbError) throw dbError;

        res.json({ 
            success: true, 
            message: 'Konten situs berhasil disimpan.', 
            savedContent: newContent 
        });

    } catch (error) {
        res.status(500).json({ 
            error: 'Gagal menyimpan data konten situs.', 
            details: error.message 
        });
    }
});


// =========================================================
// === 2. PUBLIC API (READ-ONLY) ===
// =========================================================

// Endpoint untuk mendapatkan total dana terkumpul (PUBLIC)
app.get('/api/public/weiraised', async (req, res) => {
    try {
        const weiRaised = await crowdsaleReader.weiRaised();
        const ethRaised = ethers.formatEther(weiRaised); 
        res.json({ ethRaised: ethRaised });
    } catch (error) {
        console.error("Kesalahan mendapatkan weiRaised:", error);
        res.status(500).json({ error: 'Gagal mengambil total dana yang terkumpul.' });
    }
});

// Endpoint untuk mendapatkan status Whitelist alamat tertentu (PUBLIC)
app.get('/api/public/whitelist-status/:address', async (req, res) => {
    try {
        const address = req.params.address;
        if (!ethers.isAddress(address)) {
            return res.status(400).json({ error: 'Alamat tidak valid.' });
        }
        const status = await crowdsaleReader.isWhitelisted(address);
        res.json({ isWhitelisted: status });
    } catch (error) {
        console.error("Kesalahan mendapatkan status whitelist:", error);
        res.status(500).json({ error: 'Gagal mengambil status whitelist dari Smart Contract.' });
    }
});

// Endpoint untuk mendapatkan konfigurasi Tema dan Konten Situs (PUBLIC)
app.get('/api/public/site-settings', async (req, res) => {
    try {
        let siteContent = DEFAULT_SITE_CONTENT; 

        const { data } = await supabase
            .from('site_settings')
            .select('setting_value')
            .eq('setting_key', 'site_content')
            .single();
        
        if (data && data.setting_value) {
            siteContent = data.setting_value;
        }

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
// === 3. START SERVER ===
// =========================================================

app.listen(port, () => {
    console.log(`Server API berjalan di http://localhost:${port}`);
    console.log(`Owner Wallet Address: ${signer.address}`);
    console.log(`SC Address: ${process.env.CROWDSALE_ADDRESS}`);
});