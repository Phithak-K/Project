import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import FCMProvider from '../components/FCMProvider';
import { Toaster } from 'react-hot-toast';

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
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
      className={`${kanit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('driver-theme') === 'dark') {
                  document.documentElement.classList.add('driver-dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body" suppressHydrationWarning>
        <GoogleOAuthProvider clientId={googleClientId}>
          <FCMProvider>
            <div className="sp-page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </FCMProvider>
        </GoogleOAuthProvider>
        <Toaster position="top-center" reverseOrder={false} />
      </body>
    </html>
  );
}
