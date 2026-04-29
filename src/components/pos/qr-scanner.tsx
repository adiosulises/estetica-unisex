"use client";

import { useEffect, useRef, useState } from "react";
import { X, CameraOff, Loader2 } from "lucide-react";

interface QrScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Start camera
  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError("No se pudo acceder a la cámara. Verifica los permisos.");
      }
    }

    start();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Scan loop — load jsqr dynamically (client only)
  useEffect(() => {
    if (!ready) return;
    let stopped = false;

    async function scanLoop() {
      // Dynamic import keeps jsqr out of SSR bundle
      const { default: jsQR } = await import("jsqr");
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      function tick() {
        if (stopped) return;
        if (video!.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas!.width = video!.videoWidth;
        canvas!.height = video!.videoHeight;
        ctx!.drawImage(video!, 0, 0);
        const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          onScan(code.data);
          return; // stop on success
        }
        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    scanLoop();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/70 flex-shrink-0">
        <p className="text-white text-sm font-medium">Apunta al código QR</p>
        <button
          onClick={onClose}
          className="text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={22} />
        </button>
      </div>

      {/* Camera */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay */}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-64 h-64 z-10"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
            >
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              {ready && (
                <span className="absolute left-2 right-2 h-0.5 bg-[var(--primary)] rounded-full animate-scan" />
              )}
            </div>
          </div>
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white px-8 text-center">
            <CameraOff size={48} className="opacity-50" />
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}
      </div>

      <p className="text-center text-white/50 text-xs py-4 flex-shrink-0">
        El SKU se añadirá automáticamente al carrito
      </p>
    </div>
  );
}
