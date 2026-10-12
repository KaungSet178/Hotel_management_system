import { useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2, ScanLine, SwitchCamera } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'error';

interface QrScannerProps {
  onDecode: (text: string) => void;
  active?: boolean;
  className?: string;
}

/** Ignore the same code for this long so one QR isn't released repeatedly. */
const DUPLICATE_COOLDOWN_MS = 2500;
/** Throttle the (heavier) JS decoder — roughly 8 frames per second. */
const JSQR_INTERVAL_MS = 125;
/** Downscale frames before JS decoding for speed. */
const DECODE_MAX_WIDTH = 640;

/**
 * Decoder availability, resolved once at load:
 *  - `BarcodeDetector` is native but ChromeOS/macOS only.
 *  - `jsQR` is our vendored, pure-JS fallback that works everywhere (incl. Windows).
 */
const HAS_CAMERA_API =
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
const HAS_NATIVE_DETECTOR = typeof window !== 'undefined' && typeof window.BarcodeDetector !== 'undefined';
const HAS_JSQR = typeof window !== 'undefined' && typeof window.jsQR === 'function';
const CAN_DECODE = HAS_NATIVE_DETECTOR || HAS_JSQR;
const CAN_SCAN = HAS_CAMERA_API && CAN_DECODE;

export function QrScanner({ onDecode, active = true, className }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDecodeRef = useRef(onDecode);
  const lastValueRef = useRef('');
  const lastAtRef = useRef(0);

  const [enabled, setEnabled] = useState(active);
  const [nonce, setNonce] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [status, setStatus] = useState<ScannerStatus>(CAN_SCAN ? 'starting' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    if (!enabled || !CAN_SCAN) return;

    const video = videoRef.current;
    if (!video) return;

    const NativeDetector = window.BarcodeDetector;
    const jsQr = typeof window.jsQR === 'function' ? window.jsQR : null;

    let cancelled = false;
    let running = false;
    let raf = 0;
    let lastJsQrAt = 0;
    let stream: MediaStream | null = null;
    let detector: BarcodeDetectorInstance | null = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    function report(value: string): void {
      const now = Date.now();
      if (value !== lastValueRef.current || now - lastAtRef.current > DUPLICATE_COOLDOWN_MS) {
        lastValueRef.current = value;
        lastAtRef.current = now;
        onDecodeRef.current(value);
      }
    }

    function decodeWithNative(el: HTMLVideoElement): Promise<string | null> {
      if (!detector) return Promise.resolve(null);
      return detector
        .detect(el)
        .then((codes) => codes[0]?.rawValue?.trim() ?? null)
        .catch(() => null);
    }

    function decodeWithJsQr(el: HTMLVideoElement): string | null {
      if (!jsQr || !ctx) return null;
      const vw = el.videoWidth;
      const vh = el.videoHeight;
      if (!vw || !vh) return null;
      const scale = Math.min(1, DECODE_MAX_WIDTH / vw);
      const w = Math.max(1, Math.round(vw * scale));
      const h = Math.max(1, Math.round(vh * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(el, 0, 0, w, h);
      const image = ctx.getImageData(0, 0, w, h);
      const result = jsQr(image.data, w, h, { inversionAttempts: 'dontInvert' });
      return result?.data?.trim() ?? null;
    }

    async function tick() {
      if (!running) return;
      const el = videoRef.current;
      if (el && el.readyState >= 2) {
        let value: string | null = null;
        if (detector) {
          value = await decodeWithNative(el);
        } else {
          const now = performance.now();
          if (now - lastJsQrAt >= JSQR_INTERVAL_MS) {
            lastJsQrAt = now;
            value = decodeWithJsQr(el);
          }
        }
        if (value) report(value);
      }
      if (running) {
        raf = requestAnimationFrame(() => {
          void tick();
        });
      }
    }

    async function start() {
      if (!video) return;
      try {
        if (NativeDetector) {
          const formats = await NativeDetector.getSupportedFormats().catch(() => [] as string[]);
          if (cancelled) return;
          if (formats.includes('qr_code')) {
            detector = new NativeDetector({ formats: ['qr_code'] });
          }
        }
        if (!detector && !jsQr) {
          setMessage('No QR decoder is available in this browser. Use manual entry below.');
          setStatus('error');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (cancelled) return;

        running = true;
        setMessage('');
        setStatus('scanning');
        raf = requestAnimationFrame(() => {
          void tick();
        });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setMessage('Camera permission was blocked. Allow camera access, then retry.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setMessage('No camera was found on this device.');
        } else {
          setMessage('Unable to start the camera.');
        }
        setStatus('error');
      }
    }

    void start();

    return () => {
      cancelled = true;
      running = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [enabled, nonce, facingMode]);

  const handleStart = (): void => {
    setMessage('');
    setStatus('starting');
    setEnabled(true);
    setNonce((n) => n + 1);
  };

  const handleStop = (): void => {
    setEnabled(false);
    setStatus('idle');
  };

  const handleSwitch = (): void => {
    if (!CAN_SCAN) return;
    setMessage('');
    setStatus('starting');
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
  };

  const scanning = status === 'scanning';
  const busy = status === 'starting';

  const idleMessage = !CAN_SCAN
    ? HAS_CAMERA_API
      ? 'No QR decoder is available in this browser. Use manual entry below.'
      : 'This browser cannot access a camera. Use manual entry below.'
    : message || 'Camera is off.';

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#050b16]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn('h-full w-full object-cover', !scanning && 'opacity-0')}
        />

        {/* Framing corners */}
        <span className="pointer-events-none absolute top-4 left-4 h-6 w-6 rounded-tl-lg border-t-2 border-l-2 border-[#89f5e7]/90" />
        <span className="pointer-events-none absolute top-4 right-4 h-6 w-6 rounded-tr-lg border-t-2 border-r-2 border-[#89f5e7]/90" />
        <span className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#89f5e7]/90" />
        <span className="pointer-events-none absolute right-4 bottom-4 h-6 w-6 rounded-br-lg border-r-2 border-b-2 border-[#89f5e7]/90" />

        {scanning && (
          <span className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 animate-[scanline_2.2s_ease-in-out_infinite] bg-[#89f5e7] shadow-[0_0_14px_3px_rgba(137,245,231,0.75)]" />
        )}

        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#89f5e7]" />
            ) : (
              <CameraOff className="h-6 w-6 text-white/45" />
            )}
            <p className="max-w-xs text-label-sm leading-snug text-white/70">
              {busy ? 'Starting the camera…' : idleMessage}
            </p>
          </div>
        )}

        {scanning && (
          <span className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-label-xs font-semibold text-white/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#89f5e7]" />
            Scanning for QR
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {scanning ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 text-label-sm font-semibold text-white/85 transition hover:bg-white/10 cursor-pointer"
          >
            <CameraOff className="h-4 w-4" />
            Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={!CAN_SCAN || busy}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-label-sm font-semibold text-[#0e1c32] transition hover:bg-white/90 disabled:opacity-50 cursor-pointer"
          >
            <ScanLine className="h-4 w-4" />
            {status === 'error' ? 'Retry camera' : 'Start camera'}
          </button>
        )}
        <button
          type="button"
          onClick={handleSwitch}
          disabled={!CAN_SCAN}
          title="Switch camera"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/85 transition hover:bg-white/10 disabled:opacity-50 cursor-pointer"
        >
          <SwitchCamera className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
