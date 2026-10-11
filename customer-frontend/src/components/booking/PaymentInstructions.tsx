import { useId, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, CircleAlert, Copy, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatMMK } from '@/lib/currency';
import { fileToPaymentProof } from '@/lib/image';
import { paymentQrPayload, type PaymentAccount } from '@/lib/paymentAccounts';
import type { PaymentProof } from '@/types';

/**
 * Manual-transfer instructions: scan/send to the payee account, then upload a
 * screenshot as proof. The QR falls back to a generated placeholder until a
 * real merchant QR image is configured on the {@link PaymentAccount}.
 */
export function PaymentInstructions({
  account,
  amount,
  reference,
  proof,
  onProofChange,
  error,
}: {
  account: PaymentAccount;
  amount: number;
  reference: string;
  proof: PaymentProof | null;
  onProofChange: (proof: PaymentProof | null) => void;
  error?: string;
}) {
  const toast = useToast();
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const payload = paymentQrPayload(account, amount, reference);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      onProofChange(await fileToPaymentProof(file));
      toast.success('Receipt attached', 'Our team will verify your payment shortly.');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'We could not attach that file.');
    } finally {
      setUploading(false);
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(account.accountId);
      setCopied(true);
      toast.info('Copied', account.accountId);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copy failed', 'Please copy the number manually.');
    }
  };

  const message = uploadError ?? error;

  return (
    <Card className="mt-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">Pay with {account.label}</h3>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-800">
          {formatMMK(amount)}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Scan the QR or transfer to the account below, then upload your payment screenshot so our team can
        verify and confirm your booking.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex rounded-2xl border border-brand-900/10 bg-white p-3">
            {account.qrImageUrl ? (
              <img
                src={account.qrImageUrl}
                alt={`${account.label} payment QR code`}
                className="h-40 w-40 rounded-lg object-contain"
              />
            ) : (
              <QRCodeCanvas value={payload} size={160} level="M" marginSize={0} fgColor="#0f2f2c" />
            )}
          </div>
          <p className="max-w-[10rem] text-center text-[11px] text-ink-mute">
            {account.qrImageUrl ? 'Scan to pay' : 'Placeholder QR — real merchant QR coming soon'}
          </p>
        </div>

        <div className="min-w-0">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-mute">Account name</dt>
              <dd className="mt-0.5 font-medium text-ink">{account.accountName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-mute">
                {account.accountIdLabel}
              </dt>
              <dd className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-base font-semibold text-ink">{account.accountId}</span>
                <button
                  type="button"
                  onClick={() => void copyAccount()}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-900/12 px-2 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-lavender-100"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </dd>
            </div>
          </dl>

          <ul className="mt-3 space-y-1.5 text-xs text-ink-soft">
            {account.instructions.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 border-t border-dashed border-brand-900/12 pt-4">
        <p className="text-sm font-medium text-ink">Upload proof of payment</p>

        {proof ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand-900/12 bg-lavender-100/50 p-3">
            <img
              src={proof.dataUrl}
              alt="Uploaded payment receipt"
              className="h-20 w-20 rounded-lg border border-brand-900/10 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{proof.fileName}</p>
              <p className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Attached — awaiting verification
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProofChange(null)}
              leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            >
              Remove
            </Button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-900/20 bg-lavender-100/40 px-4 py-6 text-center transition-colors hover:border-brand-400 hover:bg-lavender-100"
          >
            <Upload className="h-6 w-6 text-brand-600" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">
              {uploading ? 'Processing…' : 'Tap to upload a screenshot'}
            </span>
            <span className="text-xs text-ink-mute">PNG or JPG, up to 8 MB</span>
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        )}

        {message ? (
          <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-rose-600">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {message}
          </p>
        ) : null}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-mute">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Your screenshot is stored on this device only — demo mode, no real transfer is processed.
        </p>
      </div>
    </Card>
  );
}
