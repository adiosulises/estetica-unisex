import { create as qrCreate } from "qrcode";

/**
 * Genera un QR code estilizado con módulos circulares (dots) y esquinas
 * redondeadas para los patrones finder. Devuelve un data URL PNG.
 * Solo funciona en el browser (usa Canvas API).
 */
export function generateStyledQr(data: string, sizePx = 200): string {
  const qr = qrCreate(data, { errorCorrectionLevel: "M" });
  const { size: n, data: mData } = qr.modules;

  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d")!;

  // Fondo blanco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sizePx, sizePx);

  const pad = sizePx * 0.03;
  const cell = (sizePx - pad * 2) / n;

  ctx.fillStyle = "#111111";

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!mData[row * n + col]) continue;

      const cx = pad + col * cell + cell / 2;
      const cy = pad + row * cell + cell / 2;

      // Los tres patrones finder (esquinas) quedan como cuadros redondeados
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= n - 7) ||
        (row >= n - 7 && col < 7);

      if (inFinder) {
        const hw = cell * 0.44;
        roundRect(ctx, cx - hw, cy - hw, hw * 2, hw * 2, hw * 0.35);
        ctx.fill();
      } else {
        // Módulos de datos → círculos
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
