import type { Metadata } from "next";
import "./globals.css";
import AppFooter from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "MediTree",
  description: "Personal medical study archive",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
