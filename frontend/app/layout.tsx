import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { Web3Provider } from "./providers/Web3Provider";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Prava X | Privacy-First Cross-Chain Intents",
  description:
    "Prava X is a privacy-preserving cross-chain intent protocol on Polkadot Hub. ZK commitments are verified by Rust PVM and settled via XCM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
