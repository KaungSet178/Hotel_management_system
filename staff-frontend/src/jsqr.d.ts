/**
 * Vendored jsQR decoder (public/jsQR.js, loaded via a classic <script> tag) and
 * the optional native BarcodeDetector API. Declared here so the scanner can use
 * both without `any`.
 */

export interface JsQrResult {
  data: string;
  binaryData: number[];
  chunks: unknown[];
  version: number;
  location: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

export type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
) => JsQrResult | null;

declare global {
  interface Window {
    jsQR?: JsQrDecoder;
  }
}
