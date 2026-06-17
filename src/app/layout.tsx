import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANVEL Contractor Portal",
  description:
    "Private contractor operations portal for ERP Utilities Consulting Services Ltd.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
