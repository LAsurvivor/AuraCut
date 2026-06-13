import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccessGate } from "@/components/product/AccessGate";

import "./globals.css";

export const metadata: Metadata = {
  title: "AuraCut AI Background Remover",
  description: "Remove backgrounds, flip images, and export transparent PNGs with a polished AI workflow."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AccessGate>{children}</AccessGate>
      </body>
    </html>
  );
}
