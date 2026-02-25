// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 預先幫您引入資料庫功能

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhX8Yua8Po94QOeV1GK6pznV3-6RwW9W8",
  authDomain: "administrative-assistant-ef350.firebaseapp.com",
  projectId: "administrative-assistant-ef350",
  storageBucket: "administrative-assistant-ef350.firebasestorage.app",
  messagingSenderId: "119476364094",
  appId: "1:119476364094:web:7d843c598c4d27e3c2026f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
