import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import { getConfigValue } from "@/lib/config-service";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [clubName, requestHeaders] = await Promise.all([
    getConfigValue("clubName"),
    headers(),
  ]);
  const title = `${clubName} Management`;
  const description = `Manage your ${clubName} seasons, teams, and players`;
  // Proxies must overwrite forwarded headers with the public request origin.
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"))
    ?.split(",")[0].trim();
  if (!host) {
    throw new Error("Cannot generate page metadata without a request host");
  }
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim()
    ?? (isLocal ? "http" : "https");
  if (protocol !== "http" && protocol !== "https") {
    throw new Error("Page metadata requires an HTTP or HTTPS request origin");
  }
  const metadataBase = new URL(`${protocol}://${host}`);
  if (metadataBase.username || metadataBase.password || metadataBase.pathname !== "/"
    || metadataBase.search || metadataBase.hash || host.includes("/")) {
    throw new Error("Invalid request host for page metadata");
  }
  const sharingImage = {
    url: new URL("/icons/social-preview.png", metadataBase).href,
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: { url: "/icons/icon.png", type: "image/png", sizes: "160x160" },
      shortcut: "/favicon.ico",
      apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [sharingImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [sharingImage],
    },
    other: {
      "apple-mobile-web-app-title": title,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
