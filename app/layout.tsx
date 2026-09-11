import type { Metadata } from "next";
import "./globals.css";
import PetBridge from "./PetBridge";

export const metadata: Metadata = {
  title: "Stillgarden",
  description: "A quiet, satisfying garden restoration game.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<PetBridge /></body>
    </html>
  );
}
