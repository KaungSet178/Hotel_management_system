const crypto = require('crypto');

const KBZPAY_APP_ID = process.env.KBZPAY_APP_ID || 'kp_azure_hotel_app_2026';
const KBZPAY_MERCH_CODE = process.env.KBZPAY_MERCH_CODE || '2009847192';
const KBZPAY_MERCHANT_KEY = process.env.KBZPAY_MERCHANT_KEY || 'grand_azure_kbzpay_secret_key_2026';

/**
 * Generate KBZPay SHA256 Signature
 * Rule: Sort all non-empty parameters by ASCII key order,
 * join as k1=v1&k2=v2...&key=MERCHANT_KEY, then SHA256 and uppercase.
 */
function generateSignature(params, merchantKey = KBZPAY_MERCHANT_KEY) {
  const filteredKeys = Object.keys(params)
    .filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== null && String(params[k]).trim() !== '')
    .sort();

  const stringA = filteredKeys.map(k => `${k}=${params[k]}`).join('&');
  const stringSignTemp = `${stringA}&key=${merchantKey}`;

  return crypto.createHash('sha256').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
}

/**
 * Generate Mocked KBZPay Prepay Order Payload
 */
function createPrepayOrder(booking, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const merchOrderId = `KBZ-${booking.booking_reference}-${Date.now()}`;
  const totalAmount = Number(booking.total_amount).toFixed(2);

  const orderParams = {
    appid: KBZPAY_APP_ID,
    merch_code: KBZPAY_MERCH_CODE,
    merch_order_id: merchOrderId,
    total_amount: totalAmount,
    currency: options.currency || 'USD',
    trade_type: options.trade_type || 'PWA',
    title: `Grand Azure Luxury - Suite ${booking.room_number}`,
    timestamp,
    nonce_str: nonceStr,
    callback_info: JSON.stringify({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      room_number: booking.room_number
    })
  };

  const sign = generateSignature(orderParams);
  const prepayId = `KBZ_PREPAY_${crypto.randomBytes(12).toString('hex')}`;

  return {
    success: true,
    provider: 'KBZPAY',
    merch_order_id: merchOrderId,
    prepay_id: prepayId,
    prepay_data: {
      ...orderParams,
      prepay_id: prepayId,
      sign
    },
    // Raw query/app string returned to mobile app SDK
    prepay_string: `prepay_id=${prepayId}&appid=${KBZPAY_APP_ID}&merch_code=${KBZPAY_MERCH_CODE}&nonce_str=${nonceStr}&timestamp=${timestamp}&sign=${sign}`
  };
}

/**
 * Verify incoming KBZPay Webhook Signature
 */
function verifyWebhookSignature(payload, merchantKey = KBZPAY_MERCHANT_KEY) {
  if (!payload || !payload.sign) {
    return false;
  }

  const incomingSign = String(payload.sign).trim().toUpperCase();
  const calculatedSign = generateSignature(payload, merchantKey);

  return incomingSign === calculatedSign;
}

module.exports = {
  KBZPAY_APP_ID,
  KBZPAY_MERCH_CODE,
  KBZPAY_MERCHANT_KEY,
  generateSignature,
  createPrepayOrder,
  verifyWebhookSignature
};
