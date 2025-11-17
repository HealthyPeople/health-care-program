export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-blue-100">
      {children}
    </div>
  );
}

