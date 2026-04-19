'use client';
import { useEffect, useState } from 'react';
import { requestFCMToken, onMessageListener } from '../lib/firebase';

export default function FCMProvider({ children }: { children: React.ReactNode }) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // Only run if user is logged in
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    
    const token = getCookie('token');
    if (!token) return;

    // Wait slightly to let page render
    const initFCM = setTimeout(async () => {
      try {
        const tokenStr = await requestFCMToken();
        if (tokenStr) {
          setFcmToken(tokenStr);
          // Save to Backend
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fcmToken: tokenStr })
          }).catch(err => console.error('FCM sync error', err));
        }
      } catch (err) {
        console.warn('FCM initialisation failed', err);
      }
    }, 2000);

    return () => clearTimeout(initFCM);
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (!fcmToken) return;
    const listen = async () => {
      try {
         const payload: any = await onMessageListener();
         console.log('FCM Foreground Notification Received:', payload);
         // You could trigger a toast notification here
         alert(`🔔 แจ้งเตือน: ${payload?.notification?.title}\n${payload?.notification?.body}`);
         listen(); // Recursive listen
      } catch (err) {
         console.log('FCM Listenter error', err);
      }
    };
    listen();
  }, [fcmToken]);

  return <>{children}</>;
}
