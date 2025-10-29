// config/themeConfig.js

/**
 * Konfigurasi tema dan konten default untuk Frontend Admin Panel dan Situs Publik.
 * Nilai-nilai ini berfungsi sebagai sumber kebenaran (Source of Truth) awal.
 */
const DEFAULT_ADMIN_THEME = {
    // Nama unik untuk mengidentifikasi tema
    themeName: 'dark-mode-default',

    // Skema warna utama
    colors: {
        primary: '#007bff',       // Biru terang
        secondary: '#6c757d',     // Abu-abu
        background: '#121212',    // Sangat gelap (untuk dark mode)
        text: '#ffffff',          // Putih
        danger: '#dc3545',         // Merah
        success: '#28a745',         // Hijau
        info: '#17a2b8'           // Biru Cyan
    },

    // Konfigurasi tata letak default
    layout: {
        sidebarCollapsed: false,  
        fontSize: 'medium',        
        direction: 'ltr'
    },
    
    // =========================================================
    // === KONFIGURASI FILE UPLOAD (KYC) ===
    // =========================================================
    fileConstraints: {
        // Tipe file yang diizinkan untuk diunggah (gambar dokumen)
        allowedImageMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp'
        ],
        // Ukuran file maksimum yang diizinkan (dalam byte)
        maxFileSize: 5 * 1024 * 1024, // 5 MB
        fileTypeDescription: 'JPG, JPEG, PNG, atau WEBP'
    }
};


/**
 * @dev Konfigurasi yang berhubungan dengan aset visual situs dan teks statis.
 * Nilai-nilai ini dapat diatur melalui Admin Panel dan disimpan di database 
 * (misalnya tabel 'site_settings' di Supabase).
 */
const DEFAULT_SITE_CONTENT = {
    // =========================================================
    // === ASET VISUAL (Akan diganti dengan URL Supabase Storage) ===
    // =========================================================
    assets: {
        // Logo Utama Situs (digunakan di header)
        logoUrl: '/assets/default-logo.png',
        
        // Favicon (ikon kecil di tab browser)
        faviconUrl: '/assets/default-favicon.ico',
        
        // Ilustrasi Hero Section (misalnya, gambar utama di beranda)
        heroIllustrationUrl: '/assets/default-hero.svg'
    },

    // =========================================================
    // === TEKS KONTEN PADA HALAMAN UTAMA ===
    // =========================================================
    content: {
        // HOME/HERO SECTION
        hero: {
            // Judul utama yang menarik
            title: 'Investasi Masa Depan dengan FTT Token',
            // Sub-judul/deskripsi pendek
            subtitle: 'Bergabunglah dalam Penjualan ICO kami dan nikmati akses eksklusif.'
        },

        // ABOUT SECTION
        about: {
            // Judul
            title: 'Tentang Proyek FTT',
            // Isi/paragraf panjang (dapat berupa string Markdown)
            body: `FTT Token adalah inti dari ekosistem finansial terdesentralisasi kami. Misi kami adalah... (Lanjut dengan deskripsi proyek yang panjang).`
        },

        // ROADMAP SECTION (Gunakan format array untuk poin-poin/fase)
        roadmap: {
            title: 'Peta Jalan (Roadmap)',
            items: [
                {
                    phase: 'Q4 2024',
                    description: 'Peluncuran ICO & Kontrak Cerdas FTT',
                    style: { backgroundColor: '#28a745' } // Style visual untuk UI Admin
                },
                {
                    phase: 'Q1 2025',
                    description: 'Pengembangan Beta Platform Trading',
                    style: { backgroundColor: '#ffc107' }
                }
            ]
        }
    }
};

module.exports = {
    DEFAULT_ADMIN_THEME,
    DEFAULT_SITE_CONTENT
};