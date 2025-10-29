// config/contractConfig.js

/**
 * Minimal ABI (Application Binary Interface) untuk Smart Contract Crowdsale.
 *
 * Hanya mencantumkan fungsi-fungsi yang AKAN diakses oleh backend (server.js dan listener.js).
 * Menggunakan ABI minimal jauh lebih baik daripada menyalin seluruh ABI yang besar.
 */
const CROWDSALE_ABI = [
    // =========================================================
    // === FUNGSI ADMIN (WRITE) ===
    // =========================================================
    {
        // Fungsi untuk menambahkan alamat ke Whitelist (digunakan oleh signer di server.js)
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "addToWhitelist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // =========================================================
    // === FUNGSI PUBLIK (READ) ===
    // =========================================================
    {
        // Fungsi untuk mendapatkan total dana yang terkumpul (digunakan oleh crowdsaleReader)
        "inputs": [],
        "name": "weiRaised",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        // Fungsi untuk mengecek status whitelist alamat (digunakan oleh crowdsaleReader)
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "isWhitelisted",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    
    // =========================================================
    // === EVENT (DENGARKAN OLEH listener.js) ===
    // =========================================================
    {
        // Event yang dipancarkan saat pembelian token sukses
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "purchaser",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "beneficiary",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "TokensPurchased",
        "type": "event"
    }
];

module.exports = {
    CROWDSALE_ABI
};