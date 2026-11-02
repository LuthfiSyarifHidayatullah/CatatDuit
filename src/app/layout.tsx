import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CatatDuit — Catat pengeluaran dari foto struk",
  description:
    "Catat pengeluaran dengan mudah. Foto struk, biarkan teks terbaca otomatis, tinggal cek dan simpan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
