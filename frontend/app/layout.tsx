import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import FCMProvider from '../components/FCMProvider';
import { Toaster } from 'react-hot-toast';
import { getSiteUrl } from '../lib/site-url';
import RouteTransition from '../components/RouteTransition';

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
      data-scroll-behavior="smooth"
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
              } catch (e) { console.warn('Theme init error:', e); }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body" suppressHydrationWarning>
        <GoogleOAuthProvider clientId={googleClientId}>
          <FCMProvider>
            <RouteTransition>{children}</RouteTransition>
          </FCMProvider>
        </GoogleOAuthProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={10}
          toastOptions={{
            className: 'sp-toast',
            duration: 3200,
            style: {
              background: '#1b1613',
              color: '#fdfaf7',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '0.75rem 1rem',
              maxWidth: '92vw',
            },
            success: { iconTheme: { primary: '#f2600f', secondary: '#fff' } },
            error: { iconTheme: { primary: '#e5484d', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
