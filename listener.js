// listener.js

// 1. Core Dependencies
const dotenv = require('dotenv');

// 2. Blockchain and Database Libraries
const { ethers } = require('ethers');
const supabase = require('./config/supabase'); // Supabase client connection

// 3. Project Configurations
// Kita perlu ABI untuk mengetahui event apa yang harus didengarkan
const { CROWDSALE_ABI } = require('./config/contractConfig'); 

// 4. Load Environment Variables from .env
dotenv.config();

// =========================================================
// === Ethers.js Setup ===
// =========================================================

// Menggunakan JSON RPC Provider untuk koneksi ke blockchain
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

// Kontrak Crowdsale yang terhubung dengan Provider (untuk mendengarkan events)
const crowdsaleListener = new ethers.Contract(
    process.env.CROWDSALE_ADDRESS,
    CROWDSALE_ABI,
    provider
);

// Nama Event yang akan didengarkan dari Smart Contract
const EVENT_NAME = 'TokensPurchased';
// Nama tabel di Supabase untuk menyimpan log transaksi
const DB_TABLE_NAME = 'transactions';


/**
 * Fungsi utama untuk memulai mendengarkan event blockchain.
 */
async function startListening() {
    console.log(`[LISTENER] Memulai proses mendengarkan event '${EVENT_NAME}'...`);
    console.log(`[LISTENER] SC Address: ${process.env.CROWDSALE_ADDRESS}`);
    console.log(`[LISTENER] Jaringan: ${process.env.SEPOLIA_RPC_URL}`);

    // Mengecek koneksi
    try {
        const network = await provider.getNetwork();
        console.log(`[LISTENER] Terhubung ke Chain ID: ${network.chainId}`);
    } catch (err) {
        console.error("[LISTENER] GAGAL terhubung ke jaringan RPC:", err.message);
        return;
    }

    // =========================================================
    // === LISTENER UTAMA: MENDENGARKAN EVENT ===
    // =========================================================
    
    // Metode 'on' akan terus mendengarkan setiap kali event dipancarkan
    crowdsaleListener.on(EVENT_NAME, async (purchaser, beneficiary, value, amount, event) => {
        
        // Mengkonversi nilai ke format yang lebih mudah dibaca (Ether)
        const ethPaid = ethers.formatEther(value); // Jumlah ETH yang dibayarkan
        const tokensBought = ethers.formatEther(amount); // Jumlah token yang diterima
        const transactionHash = event.log.transactionHash;

        console.log("-----------------------------------------");
        console.log(`[EVENT DITEMUKAN] ${EVENT_NAME}`);
        console.log(`  Purchaser:   ${purchaser}`);
        console.log(`  Beneficiary: ${beneficiary}`);
        console.log(`  ETH Dibayar: ${ethPaid} ETH`);
        console.log(`  Token Dibeli: ${tokensBought} Token`);
        console.log(`  Tx Hash:     ${transactionHash}`);
        console.log("-----------------------------------------");


        // --- MENYIMPAN DATA KE SUPABASE ---
        try {
            const { error } = await supabase
                .from(DB_TABLE_NAME)
                .insert([
                    {
                        purchaser_address: purchaser.toLowerCase(),
                        beneficiary_address: beneficiary.toLowerCase(),
                        eth_paid_wei: value.toString(), // Simpan nilai asli dalam Wei
                        eth_paid_eth: parseFloat(ethPaid),
                        tokens_bought: parseFloat(tokensBought),
                        transaction_hash: transactionHash,
                        block_number: event.log.blockNumber,
                        timestamp: new Date().toISOString()
                    }
                ]);

            if (error) {
                console.error(`[DB ERROR] Gagal menyimpan transaksi ke ${DB_TABLE_NAME}:`, error);
            } else {
                console.log(`[DB SUCCESS] Transaksi hash ${transactionHash.substring(0, 10)}... berhasil disimpan.`);
            }
        } catch (dbError) {
            console.error("[DB CRITICAL ERROR] Kesalahan Supabase:", dbError.message);
        }
    });

    // BARIS BERMASALAH DIHAPUS.
}

// Jalankan Listener
startListening();