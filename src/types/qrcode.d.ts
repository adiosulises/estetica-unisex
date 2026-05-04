declare module "qrcode" {
  interface QRCodeOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    type?: string;
    quality?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
    width?: number;
    scale?: number;
  }

  function create(
    text: string,
    options?: QRCodeOptions
  ): { modules: { data: Uint8Array; size: number } };

  function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions
  ): Promise<void>;

  function toDataURL(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  function toString(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;
}
