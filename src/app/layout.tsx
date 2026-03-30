import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { DeskDock } from "@/components/ui/desk-dock";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} h-full desk-surface text-foreground font-sans`}>
        <div className="h-full flex flex-col relative">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
          <DeskDock />
        </div>
      </body>
    </html>
  );
}
