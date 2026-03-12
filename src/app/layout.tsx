import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Tool Finder - Find the Perfect AI Tool",
  description:
    "Discover the best AI tools for your needs from our curated database of 200+ tools. Get personalized recommendations powered by Gemini AI.",
  keywords: [
    "AI tools",
    "artificial intelligence",
    "tool finder",
    "AI recommendations",
    "ChatGPT",
    "Midjourney",
    "AI assistant",
  ],
  openGraph: {
    title: "AI Tool Finder - Find the Perfect AI Tool",
    description:
      "Discover the best AI tools for your needs from our curated database of 200+ tools.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Tool Finder",
    description:
      "Discover the best AI tools for your needs. Powered by Gemini AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
