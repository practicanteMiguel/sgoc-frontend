export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--color-surface-0)" }}
    >
      {children}
    </div>
  );
}
