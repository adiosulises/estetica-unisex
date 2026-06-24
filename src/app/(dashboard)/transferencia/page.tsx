export default function TransferenciaPage() {
  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center p-20">
      <div className="flex flex-col gap-8 text-center">
        <p className="font-mono font-bold tracking-widest text-[var(--foreground)] whitespace-nowrap"
           style={{ fontSize: "clamp(1.6rem, 6vw, 5rem)" }}>
          722969028719807775
        </p>
        <p className="font-semibold text-[var(--foreground)]"
           style={{ fontSize: "clamp(1.8rem, 7vw, 5.5rem)" }}>
          Mercado Pago
        </p>
        <p className="font-semibold text-[var(--foreground)]"
           style={{ fontSize: "clamp(1.8rem, 7vw, 5.5rem)" }}>
          Marlene García
        </p>
      </div>
    </div>
  );
}
