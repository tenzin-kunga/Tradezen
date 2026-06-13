import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/components/Toast";
import AppShell from "@/components/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRADEZEN",
  description: "Carbon Ledger V2.4.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${jetbrainsMono.variable}`}>
      <body style={{ margin: 0 }}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <TooltipProvider>
                <AppShell>{children}</AppShell>
              </TooltipProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
