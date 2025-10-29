// config/supabase.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Muat variabel lingkungan dari file .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service Role Key (Wajib untuk Backend!)

// Lakukan pemeriksaan kritis untuk memastikan kunci ada
if (!supabaseUrl || !supabaseKey) {
    // Jika tidak ada, hentikan server dengan pesan error yang jelas
    throw new Error(
        "Kesalahan Konfigurasi Supabase: Variabel SUPABASE_URL atau SUPABASE_SERVICE_KEY tidak ditemukan di file .env."
    );
}

/**
 * @dev Membuat dan mengekspor klien Supabase yang dapat digunakan di seluruh backend.
 * Menggunakan Service Role Key memberikan hak akses penuh dari sisi server.
 */
const supabase = createClient(supabaseUrl, supabaseKey, {
    // Opsi tambahan untuk memastikan koneksi yang stabil
    auth: {
        persistSession: false, // Tidak perlu persistensi sesi di server
    }
});

module.exports = supabase;