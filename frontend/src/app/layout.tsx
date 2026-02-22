import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECEB Building Viewer",
  description: "Electrical & Computer Engineering Building — UIUC",
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
