import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Providers } from "@/components/layout/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLM Prompt Testing Platform",
  description: "Prompt regression testing for LLM systems",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <Providers>
          <Sidebar />
          <main className="ml-60 min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}