import type { Metadata } from "next";
import { Fraunces, Onest } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import FCMProvider from '../components/FCMProvider';

// Editorial display font — dramatic contrast, logistics gravitas
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "700", "900"],
  style: ["normal", "italic"],
});

// Modern humanist body font — legible, purposeful
const onest = Onest({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SwiftPath — Enterprise Logistics",
  description: "ระบบจัดการขนส่งระดับ Enterprise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <html
      lang="th"
      className={`${fraunces.variable} ${onest.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <GoogleOAuthProvider clientId={googleClientId}>
          <FCMProvider>
            {children}
          </FCMProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}