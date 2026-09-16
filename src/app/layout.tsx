import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CK Coaching",
  description: "App quản lý tập luyện 12 tuần",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CK Coaching",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1C2E20",
  viewportFit: "cover",
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
