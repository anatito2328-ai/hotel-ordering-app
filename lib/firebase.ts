import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

const clean = (val?: string) => val?.trim().replace(/^["']|["']$/g, "") || "";

const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  databaseURL: clean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

let firebaseApp: FirebaseApp | null = null;
let firebaseDb: Database | null = null;

if (typeof window !== "undefined") {
  if (firebaseConfig.databaseURL && firebaseConfig.projectId) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firebaseDb = getDatabase(firebaseApp);
  } else {
    console.error(
      "Firebase config missing in Vercel! Check NEXT_PUBLIC_FIREBASE_DATABASE_URL and NEXT_PUBLIC_FIREBASE_PROJECT_ID."
    );
  }
}

export const app = firebaseApp as FirebaseApp;
export const db = firebaseDb as Database;