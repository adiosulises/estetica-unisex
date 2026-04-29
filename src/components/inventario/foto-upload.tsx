"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage, formatFileSize } from "@/lib/compress-image";

interface FotoUploadProps {
  value?: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  className?: string;
}

export function FotoUpload({ value, existingUrl, onChange, className }: FotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState<{ original: number; compressed: number } | null>(null);

  async function handleFile(file: File | null) {
    if (!file) {
      setPreview(existingUrl ?? null);
      setSizeInfo(null);
      onChange(null);
      return;
    }

    setCompressing(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, maxSizeKB: 300 });
      const url = URL.createObjectURL(compressed);
      setPreview(url);
      setSizeInfo({ original: file.size, compressed: compressed.size });
      onChange(compressed);
    } catch {
      // Si falla la compresión, usar el archivo original
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file);
    } finally {
      setCompressing(false);
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    handleFile(null);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-[var(--foreground)]">Foto</span>
      <div
        className={cn(
          "relative w-full h-40 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)] flex items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-colors overflow-hidden",
          preview && "border-solid border-[var(--border)]",
          compressing && "cursor-wait"
        )}
        onClick={() => !compressing && inputRef.current?.click()}
      >
        {compressing ? (
          <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-xs">Comprimiendo...</span>
          </div>
        ) : preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
            <ImagePlus size={28} strokeWidth={1.5} />
            <span className="text-xs">Haz clic para subir foto</span>
          </div>
        )}
      </div>

      {sizeInfo && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {formatFileSize(sizeInfo.original)} → {formatFileSize(sizeInfo.compressed)}
          {sizeInfo.compressed < sizeInfo.original && (
            <span className="text-green-600 ml-1">
              (−{Math.round((1 - sizeInfo.compressed / sizeInfo.original) * 100)}%)
            </span>
          )}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
