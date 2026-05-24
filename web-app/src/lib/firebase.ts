import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAqlI3VEg3iCCDtwAXPa02ztUjeMO6VJSo",
  authDomain: "estudo-a0215.firebaseapp.com",
  projectId: "estudo-a0215",
  storageBucket: "estudo-a0215.firebasestorage.app",
  messagingSenderId: "514236923308",
  appId: "1:514236923308:web:2dbd1535725d34cf3a8e09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
