import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BundleLab | Thoughtful product bundling",
  description:
    "A portfolio prototype for planning complementary product bundles with transparent profitability calculations.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
