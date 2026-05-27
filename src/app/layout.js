import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Easzy OS",
  description: "Personal AI-Powered Content System",
};

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-subtle text-on-background overflow-x-hidden">
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#2A2E35',
              color: '#F9FAFB',
              border: '1px solid #374151',
              fontSize: '14px',
              fontFamily: 'var(--font-inter)'
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#2A2E35',
              },
            },
          }}
        />
        <Sidebar />
        <Header />
        {children}
      </body>
    </html>
  );
}
