import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// One family (docs/FRONTEND.md §2): Hanken Grotesk 400 and 500, tabular figures for every number.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sooth: a DOGE stop-loss in your own wallet",
  description:
    "Sooth sells your native DOGE only when the signed DOGE/USD price falls to your stop, and always leaves DOGE for gas. DogeOS Chikyū testnet.",
};

export const viewport: Viewport = {
  themeColor: "#e2e2e2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={hanken.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
