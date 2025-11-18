export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-blue-100 overflow-auto">
      {children}
    </div>
  );
}

