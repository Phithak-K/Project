import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: any = null;
try {
  if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  }
} catch (e) {
  console.warn('Firebase init skipped or failed:', e);
}

export const requestFCMToken = async () => {
  try {
    if (typeof window === 'undefined' || !app) return null;
    const supported = await isSupported();
    if (!supported) {
      console.warn('FCM is not supported in this browser.');
      return null;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      if (currentToken) {
        return currentToken;
      }
    }
  } catch (error) {
    console.warn('FCM Token error:', error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || !app) return;
    isSupported().then(supported => {
        if (!supported) return;
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    }).catch(err => console.warn('FCM listener error:', err));
  });

export { app };