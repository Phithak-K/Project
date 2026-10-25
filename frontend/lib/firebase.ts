import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAMOQL7YcmvMjBFhPO6aZbf_BZse-UjKEg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'swiftpath-otp-f3a2f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'swiftpath-otp-f3a2f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'swiftpath-otp-f3a2f.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '144758265147',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:144758265147:web:9bdaf537f2e03e2f18531e',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-11S82GY34K',
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