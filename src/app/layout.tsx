import type { Metadata } from "next";
import "./globals.css";
import { RootShell } from "@/components/layout/RootShell";

export const metadata: Metadata = {
  title: "Creative OS",
  description: "Overlay intelligente per freelance creativo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full">
      <body className="h-full desk-surface text-foreground font-sans">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
