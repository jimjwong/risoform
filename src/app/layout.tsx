import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "risoform — Good questions. Great answers.",
  description: "Create beautiful forms that feel like a conversation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
