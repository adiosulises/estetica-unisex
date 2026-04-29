export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex items-center justify-center bg-[var(--muted)] px-4">
      {children}
    </div>
  );
}
