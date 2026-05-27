import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseline EEG Feature Alignment",
  description:
    "A lightweight subject-specific feature alignment layer for wearable EEG systems operating under longitudinal drift and low-channel constraints.",
  keywords: ["EEG", "neurotechnology", "longitudinal adaptation", "wearable BCI", "covariance normalization", "feature alignment"],
  openGraph: {
    title: "Baseline",
    description: "Neural signals only become meaningful when interpreted relative to themselves.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="grain">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
