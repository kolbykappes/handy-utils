import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handy Utils",
  description: "Handy random utilities I need",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
