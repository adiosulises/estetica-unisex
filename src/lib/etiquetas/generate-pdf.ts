import { jsPDF } from "jspdf";
import type { SheetConfig } from "./sheet-configs";
import { generateStyledQr } from "./styled-qr";

export interface LabelData {
  sku: string;
  name: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  price: number;
}

// ─── Canvas dimensions ────────────────────────────────────────────────────────
// 800×305 px → se escala a 66.675mm×25.4mm en el PDF (≈305 DPI).
const PX_W = 800;
const PX_H = 305;
const PAD = 16;

// 5 líneas de texto que llenan la etiqueta de arriba a abajo
const LINE_H = (PX_H - PAD * 2) / 5; // ≈ 54.6 px por fila

// QR — esquina superior derecha, abarca filas 1-3
const QR_SIZE = Math.round(LINE_H * 3);
const QR_X = PX_W - PAD - QR_SIZE;
const QR_Y = PAD;

// Anchos de texto: filas 1-3 comparten espacio con QR, filas 4-5 van full
const TX = PAD;                          // margen izquierdo
const TX_W_NARROW = QR_X - PAD - 10;    // ancho para filas 1-3
const TX_W_FULL   = PX_W - PAD * 2;     // ancho para filas 4-5

// Función auxiliar para la baseline de cada fila (1-indexed)
const lineY = (row: number) => PAD + (row - 1) * LINE_H + LINE_H * 0.74;

// Fonts
const FONT = '"Courier New", "Microsoft YaHei", "PingFang SC", monospace';

// ─── Dibuja una etiqueta completa sobre un canvas y devuelve el data URL ─────
async function drawLabel(label: LabelData): Promise<string> {
  const qrDataUrl = generateStyledQr(label.sku, QR_SIZE);
  const qrImg = await loadImage(qrDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = PX_W;
  canvas.height = PX_H;
  const ctx = canvas.getContext("2d")!;

  // ── Fondo blanco ─────────────────────────────────────────────────────────
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PX_W, PX_H);

  // ── Borde sutil ───────────────────────────────────────────────────────────
  ctx.strokeStyle = "#CCCCCC";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, PX_W - 1, PX_H - 1);

  // ── QR — esquina superior derecha ─────────────────────────────────────────
  ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // Tamaño único para todos los textos: el más grande que cabe en la línea
  const FS = Math.round(LINE_H * 0.68); // ≈ 37px — llena la fila con buen aire
  ctx.textBaseline = "alphabetic";

  // ── LÍNEA 1: Nombre (bold) ────────────────────────────────────────────────
  ctx.font = `bold ${FS}px ${FONT}`;
  ctx.fillStyle = "#0A0A0A";
  ctx.fillText(truncate(ctx, label.name.toUpperCase(), TX_W_NARROW), TX, lineY(1));

  // ── LÍNEA 2: Marca ────────────────────────────────────────────────────────
  ctx.font = `${FS}px ${FONT}`;
  ctx.fillStyle = "#444444";
  ctx.fillText(truncate(ctx, (label.brand ?? "—").toUpperCase(), TX_W_NARROW), TX, lineY(2));

  // ── LÍNEA 3: 尺码 · 颜色 ──────────────────────────────────────────────────
  ctx.font = `${FS}px ${FONT}`;
  ctx.fillStyle = "#333333";
  const sz = label.size  ? label.size.toUpperCase()  : "---";
  const cl = label.color ? label.color.toUpperCase() : "---";
  ctx.fillText(`尺码: ${sz}   颜色: ${cl}`, TX, lineY(3));

  // ── LÍNEA 4: SKU ─────────────────────────────────────────────────────────
  ctx.font = `${FS}px ${FONT}`;
  ctx.fillStyle = "#0A0A0A";
  ctx.fillText(truncate(ctx, label.sku.toUpperCase(), TX_W_FULL), TX, lineY(4));

  // ── LÍNEA 5: ¥Precio (bold, izq)  EU LTD. (normal, der) ─────────────────
  const y5 = lineY(5);

  ctx.font = `bold ${FS}px ${FONT}`;
  ctx.fillStyle = "#0A0A0A";
  ctx.textAlign = "left";
  ctx.fillText(`¥${Math.round(label.price)}`, TX, y5);

  ctx.font = `${FS}px ${FONT}`;
  ctx.fillStyle = "#888888";
  ctx.textAlign = "right";
  ctx.fillText("EU LTD.", PX_W - PAD, y5);

  return canvas.toDataURL("image/png");
}

// ─── Truncar texto para que quepa en maxWidth px ──────────────────────────────
function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

// ─── Carga un data URL como HTMLImageElement ──────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Función interna: construye el jsPDF sin hacer nada con él ───────────────
async function buildPdf(
  labels: LabelData[],
  sheet: SheetConfig,
  startAt: number
): Promise<InstanceType<typeof jsPDF>> {
  const {
    cols, rows,
    labelWidthMm, labelHeightMm,
    pageWidthMm, pageHeightMm,
    marginTopMm, marginLeftMm,
    colGapMm, rowGapMm,
  } = sheet;

  const labelsPerPage = cols * rows;
  const labelImages = await Promise.all(labels.map(drawLabel));

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
    orientation: "portrait",
  });

  let currentPage = 0;

  labels.forEach((_, i) => {
    const posOnSheet = startAt - 1 + i;
    const pageIndex = Math.floor(posOnSheet / labelsPerPage);
    const posOnPage = posOnSheet % labelsPerPage;
    const row = Math.floor(posOnPage / cols);
    const col = posOnPage % cols;

    while (currentPage < pageIndex) {
      pdf.addPage();
      currentPage++;
    }

    const x = marginLeftMm + col * (labelWidthMm + colGapMm);
    const y = marginTopMm + row * (labelHeightMm + rowGapMm);

    pdf.addImage(labelImages[i], "PNG", x, y, labelWidthMm, labelHeightMm);
  });

  return pdf;
}

// ─── Descargar PDF ────────────────────────────────────────────────────────────
export async function generateLabelsPdf(
  labels: LabelData[],
  sheet: SheetConfig,
  startAt: number
): Promise<void> {
  const pdf = await buildPdf(labels, sheet, startAt);
  pdf.save(`etiquetas-${Date.now()}.pdf`);
}

// ─── Abrir diálogo de impresión del SO (sin descargar nada) ──────────────────
export async function printLabelsPdf(
  labels: LabelData[],
  sheet: SheetConfig,
  startAt: number
): Promise<void> {
  const pdf = await buildPdf(labels, sheet, startAt);
  // autoPrint() inserta una acción JS para abrir el diálogo al cargar el PDF
  pdf.autoPrint();
  // Abre el PDF en una pestaña nueva — el diálogo de impresión aparece solo
  window.open(pdf.output("bloburl"), "_blank");
}
