import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nix - Secure One-Time Sharing",
  description: "Share sensitive data securely with one-time viewable links. Encrypted in your browser, ephemeral, and zero-knowledge.",
  keywords: ["secure file sharing", "one-time link", "encrypted sharing", "self-destructing messages", "password share", "secret link"],
  authors: [{ name: "Nix" }],
  creator: "Nix",
  metadataBase: new URL("https://nix-share.com"),
  openGraph: {
    title: "Nix - Secure One-Time Sharing",
    description: "Share sensitive data securely with one-time viewable links. Zero knowledge, end-to-end encrypted.",
    url: "https://nix-share.com",
    siteName: "Nix",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nix - Secure One-Time Sharing",
    description: "Share sensitive data securely with one-time viewable links.",
    creator: "@nixshare",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-display bg-background-dark text-text-main antialiased selection:bg-primary/30 selection:text-white min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
