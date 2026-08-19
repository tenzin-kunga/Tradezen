import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/workspace/init";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/components/Toast";
import AppShell from "@/components/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TrpcProvider } from "@/providers/trpc-provider";
import { WorkspaceProvider } from "@/lib/workspace/workspace-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ margin: 0 }}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <TrpcProvider>
                <TooltipProvider>
                  <WorkspaceProvider>
                    <AppShell>{children}</AppShell>
                  </WorkspaceProvider>
                </TooltipProvider>
              </TrpcProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
