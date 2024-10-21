import { initializeApp } from "firebase/app";
import { getAuth ,createUserWithEmailAndPassword ,signInWithEmailAndPassword} from "firebase/auth";
import { getFirestore ,collection, addDoc  } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAmVS6vhG9YAbilXbnjhINfoQur7QWqJEY",
    authDomain: "managment-system-1f6c3.firebaseapp.com",
    projectId: "managment-system-1f6c3",
    storageBucket: "managment-system-1f6c3.appspot.com",
    messagingSenderId: "1081387362498",
    appId: "1:1081387362498:web:4c20ab18303d9b8a1ab35b",
    measurementId: "G-4QK0H75J0T"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  export { app ,auth ,createUserWithEmailAndPassword, db ,collection, addDoc ,signInWithEmailAndPassword ,getAuth}