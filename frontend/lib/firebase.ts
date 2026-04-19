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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const requestFCMToken = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('FCM is not supported in this browser.');
      return null;
    }

    const messaging = getMessaging(app);
    // VAPID KEY typically goes here, but we can rely on standard setup if missing
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Add this to env if available, else standard works on some platforms
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
    isSupported().then(supported => {
        if (!supported) return;
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
  });

export { app };