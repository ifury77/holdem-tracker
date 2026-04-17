import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC8mDTC6D0yqmXdo7VQVyx7DnrIjwGg-6I",
  authDomain: "mps-poker-bec02.firebaseapp.com",
  projectId: "mps-poker-bec02",
  storageBucket: "mps-poker-bec02.firebasestorage.app",
  messagingSenderId: "719392847742",
  appId: "1:719392847742:web:086a74b5b6f0394ccee52f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
