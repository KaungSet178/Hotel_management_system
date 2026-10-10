const QRCode = require('qrcode');
const crypto = require('crypto');

const SECRET_SALT = process.env.QR_SECRET_SALT || 'grand-azure-luxury-hotel-secret-salt-2026';

/**
 * Generate a cryptographically signed QR token for contactless check-in
 */
function createSecureQrToken(bookingId, bookingReference) {
  const timestamp = Date.now();
  const rawPayload = `${bookingId}:${bookingReference}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SECRET_SALT).update(rawPayload).digest('hex').substring(0, 16);
  return `LUX-QR-${bookingReference}-${hmac}`;
}

/**
 * Generate QR code Image as Base64 Data URL
 */
async function generateQrDataUrl(textData, options = {}) {
  try {
    const opts = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      color: {
        dark: '#0A0F1D',      // Deep luxury navy
        light: '#FFFFFF'     // Crisp white background
      },
      width: options.width || 320,
      ...options
    };
    return await QRCode.toDataURL(textData, opts);
  } catch (err) {
    console.error('Error generating QR code data URL:', err);
    throw err;
  }
}

/**
 * Generate in-room service portal URL & QR Code
 */
async function generateInRoomQr(roomNumber, bookingId = null, serverHost = 'http://localhost:3000') {
  const targetUrl = `${serverHost}/?room=${encodeURIComponent(roomNumber)}${bookingId ? `&booking=${bookingId}` : ''}#guest-service`;
  const qrDataUrl = await generateQrDataUrl(targetUrl, { width: 300 });
  return {
    targetUrl,
    qrDataUrl
  };
}

module.exports = {
  createSecureQrToken,
  generateQrDataUrl,
  generateInRoomQr
};
