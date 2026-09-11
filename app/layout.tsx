import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stillgarden",
  description: "A quiet, satisfying garden restoration game.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
