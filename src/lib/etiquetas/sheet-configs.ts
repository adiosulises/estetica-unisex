export interface SheetConfig {
  id: string;
  name: string;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  colGapMm: number;
  rowGapMm: number;
}

/**
 * Avery 5160 / Uline S-11352 / equivalente genérico más vendido en papelerías.
 * 30 etiquetas por hoja carta (3 cols × 10 filas), 2⅝" × 1" cada una.
 * Para cambiar a otro formato, agrega otra constante y actualiza DEFAULT_SHEET.
 */
export const AVERY_5160: SheetConfig = {
  id: "avery-5160",
  name: 'Avery 5160 · 30 por hoja (2⅝" × 1")',
  cols: 3,
  rows: 10,
  labelWidthMm: 66.675,
  labelHeightMm: 25.4,
  pageWidthMm: 215.9,
  pageHeightMm: 279.4,
  marginTopMm: 12.7,
  marginLeftMm: 4.76,
  colGapMm: 3.18,
  rowGapMm: 0,
};

export const SHEET_CONFIGS: SheetConfig[] = [AVERY_5160];
export const DEFAULT_SHEET = AVERY_5160;
