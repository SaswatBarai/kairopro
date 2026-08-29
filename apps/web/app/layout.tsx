import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KairoPro — AI-Powered Full-Stack Development Platform",
    template: "%s | KairoPro",
  },
  description:
    "Describe your app, and KairoPro's AI will build it — requirements, PRD, design, architecture, code, and deployment, all in one platform.",
  keywords: ["AI development", "full-stack", "code generation", "deployment", "KairoPro"],
  authors: [{ name: "KairoPro" }],
  openGraph: {
    title: "KairoPro",
    description: "AI-Powered Full-Stack Development Platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.variable, jetbrainsMono.variable, "font-sans", geist.variable, "dark")}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
