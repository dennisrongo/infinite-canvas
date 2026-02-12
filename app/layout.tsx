import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastContainer from "@/components/ui/Toast";
import NetworkStatusBanner from "@/components/ui/NetworkStatusBanner";

export const metadata: Metadata = {
  title: "Infinite Canvas",
  description: "An infinite canvas note-taking application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body>
        <QueryProvider>
        <ThemeProvider>
          <ToastProvider>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <NetworkStatusBanner />
            <div id="main-content">
              {children}
            </div>
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
