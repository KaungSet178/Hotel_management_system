import type { PaymentMethod } from '@/types';

/**
 * Payee details shown on the payment step for each manual-transfer method.
 *
 * Replace `qrImageUrl` with the real merchant QR image when it is available —
 * while it is empty the UI renders a generated placeholder QR encoding the
 * `payload` string, so the flow is demonstrable today.
 */
export interface PaymentAccount {
  method: PaymentMethod;
  /** Human label, e.g. "KBZPay". */
  label: string;
  /** Account holder the guest should transfer to. */
  accountName: string;
  /** Phone / wallet number or bank account number. */
  accountId: string;
  /** Short label describing `accountId`. */
  accountIdLabel: string;
  /** Real QR image URL — leave undefined to show a generated placeholder. */
  qrImageUrl?: string;
  /** Extra instruction lines shown under the QR. */
  instructions: string[];
}

export const PAYMENT_ACCOUNTS: Record<PaymentMethod, PaymentAccount> = {
  KBZPAY: {
    method: 'KBZPAY',
    label: 'KBZPay',
    accountName: 'StayFlow Hospitality Co., Ltd',
    accountId: '09 798 123 456',
    accountIdLabel: 'KBZPay wallet number',
    instructions: [
      'Open KBZPay and scan the QR, or send to the wallet number above.',
      'Enter the exact amount shown on this page.',
      'Screenshot the success receipt and upload it below.',
    ],
  },
  WAVEPAY: {
    method: 'WAVEPAY',
    label: 'Wave Money',
    accountName: 'StayFlow Hospitality Co., Ltd',
    accountId: '09 798 123 456',
    accountIdLabel: 'Wave Money number',
    instructions: [
      'Open Wave Money and scan the QR, or send to the number above.',
      'Transfer the exact amount shown on this page.',
      'Screenshot the receipt and upload it below.',
    ],
  },
  CB_PAY: {
    method: 'CB_PAY',
    label: 'CB Pay',
    accountName: 'StayFlow Hospitality Co., Ltd',
    accountId: '0012 3456 7890 1234',
    accountIdLabel: 'CB bank account number',
    instructions: [
      'Open CB Pay and scan the QR, or transfer to the account above.',
      'Use your booking reference as the transfer note.',
      'Screenshot the receipt and upload it below.',
    ],
  },
  CARD: {
    method: 'CARD',
    label: 'Bank transfer',
    accountName: 'StayFlow Hospitality Co., Ltd',
    accountId: '0012 3456 7890 1234',
    accountIdLabel: 'Bank account number',
    instructions: [
      'Transfer the exact amount from your bank app to the account above.',
      'Use your booking reference as the transfer note.',
      'Screenshot the receipt and upload it below.',
    ],
  },
};

/** Placeholder QR payload used until a real merchant QR image is supplied. */
export function paymentQrPayload(account: PaymentAccount, amount: number, reference: string): string {
  return [
    'STAYFLOWPAY',
    `method=${account.method}`,
    `payee=${account.accountName}`,
    `account=${account.accountId}`,
    `amount=${amount}`,
    'currency=MMK',
    `ref=${reference}`,
  ].join('|');
}
