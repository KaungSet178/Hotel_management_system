export declare function normalizeRef(ref: unknown): string;

export declare function paymentProofStore(): {
  name: string;
  configureServer(server: unknown): void;
  configurePreviewServer(server: unknown): void;
};

export default paymentProofStore;
