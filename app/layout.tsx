import type { Metadata } from "next";
import "./globals.css";
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
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Smooth theme transitions */
            *, *::before, *::after {
              transition-property: background-color, border-color, color, fill, stroke;
              transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
              transition-duration: 200ms;
            }
            /* Faster transitions for interactive elements */
            button, a, input, textarea, select {
              transition-duration: 150ms;
            }
          `
        }} />
      </head>
      <body>
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
      </body>
    </html>
  );
}
