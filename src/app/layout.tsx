import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POKÉMON BANK",
  description: "Terminal oficial de Pokémon Bank",
  icons: {
    icon: "/assets/POKEMON BANK PNG.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
