import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CK Coaching - Workout App",
  description: "App quản lý tập luyện 12 tuần",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased text-brand-moss bg-brand-paper">
        {children}
      </body>
    </html>
  );
}

