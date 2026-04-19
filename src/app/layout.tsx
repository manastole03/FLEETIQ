import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FleetIQ - NavPro Dispatch Intelligence",
  description:
    "AI dispatcher copilot for small fleet trucking with smart load matching, trip margin analysis, and compliance guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
