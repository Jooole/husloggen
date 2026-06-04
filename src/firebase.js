import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCyZPXt55WjFkGZam6Glu5J-MdU_7rQOzI",
    authDomain: "husloggen-ce035.firebaseapp.com",
    projectId: "husloggen-ce035",
    storageBucket: "husloggen-ce035.firebasestorage.app",
    messagingSenderId: "345586253108",
    appId: "1:345586253108:web:764557c7961d6034fd3961"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);