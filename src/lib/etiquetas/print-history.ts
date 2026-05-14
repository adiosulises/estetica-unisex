const KEY = "eu-printed-labels";

// sku → ISO timestamp de última impresión
type PrintRecord = Record<string, string>;

function load(): PrintRecord {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); }
  catch { return {}; }
}

/** Marca los SKUs dados como impresos ahora mismo */
export function markPrinted(skus: string[]): void {
  const record = load();
  const now = new Date().toISOString();
  for (const sku of skus) record[sku] = now;
  localStorage.setItem(KEY, JSON.stringify(record));
}

/** Devuelve el registro completo { sku: isoDate } */
export function getPrintedRecord(): PrintRecord {
  return load();
}
