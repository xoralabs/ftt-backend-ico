// middleware/auth.js

// Import dotenv hanya untuk memastikan variabel lingkungan dimuat
// Meskipun server.js sudah memuatnya, ini adalah praktik yang baik.
const dotenv = require('dotenv');
dotenv.config();

// Ambil Kunci API Admin dari variabel lingkungan
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * Middleware untuk memvalidasi Kunci API Admin.
 * Ini mencegah akses tidak sah ke endpoint POST/Admin.
 */
const isAdmin = (req, res, next) => {
    // 1. Ambil kunci dari header request.
    // Frontend Admin Panel harus mengirim header: 'X-API-Key'
    const apiKey = req.headers['x-api-key'];

    // Cek apakah kunci rahasia sudah terdefinisi di .env
    if (!ADMIN_API_KEY) {
        console.error("Kesalahan Konfigurasi: ADMIN_API_KEY tidak ditemukan di .env!");
        // Matikan akses jika konfigurasi backend salah
        return res.status(500).json({ error: 'Kesalahan Server: Kunci Admin tidak dikonfigurasi.' });
    }

    // 2. Lakukan validasi
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        // Blokir akses jika header tidak ada atau kunci tidak cocok
        return res.status(401).json({ error: 'Akses Ditolak. Kunci API Admin tidak valid.' });
    }

    // 3. Jika kunci cocok, lanjutkan ke fungsi handler endpoint berikutnya
    next();
};

module.exports = isAdmin;