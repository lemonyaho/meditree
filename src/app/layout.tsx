import type { Metadata } from "next";
import "./globals.css";
import AppFooter from "@/components/AppFooter";
import CollapseAllController from "@/components/CollapseAllController";

export const metadata: Metadata = {
  title: "MediTree",
  description: "Personal medical study archive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <CollapseAllController />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
