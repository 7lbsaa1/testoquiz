// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  onValue, 
  push, 
  child,
  serverTimestamp,
  remove // <--- تمت إضافة هذه هنا
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWTSFTecq2_QeDyg90mM1hPNytwPXYyZ0",
  authDomain: "admin-37e09.firebaseapp.com",
  databaseURL: "https://admin-37e09-default-rtdb.firebaseio.com",
  projectId: "admin-37e09",
  storageBucket: "admin-37e09.firebasestorage.app",
  messagingSenderId: "637953105703",
  appId: "1:637953105703:web:db22cf323186b157de5302",
  measurementId: "G-GQDLTK8FY6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { 
  db, 
  auth, 
  ref, 
  set, 
  get, 
  update, 
  onValue, 
  push, 
  child, 
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  remove // <--- وتمت إضافتها في التصدير هنا
};
