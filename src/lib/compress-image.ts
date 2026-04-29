interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0–1
  maxSizeKB?: number; // intenta reducir calidad hasta llegar a este tamaño
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    maxSizeKB = 300,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Escalar si excede las dimensiones máximas
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas no disponible"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Reducir calidad iterativamente si sigue siendo muy grande
      const tryCompress = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Error al comprimir imagen"));
              return;
            }
            const sizeKB = blob.size / 1024;
            if (sizeKB > maxSizeKB && q > 0.3) {
              tryCompress(q - 0.1);
            } else {
              const ext = file.name.includes(".") ? "jpg" : file.name;
              const name = file.name.replace(/\.[^.]+$/, ".jpg") || ext;
              resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
            }
          },
          "image/jpeg",
          q
        );
      };

      tryCompress(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo cargar la imagen"));
    };

    img.src = objectUrl;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
