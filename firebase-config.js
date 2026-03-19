// Firebase 프로젝트 설정값 (Firebase Console에서 복사)
const firebaseConfig = {
  apiKey: "AIzaSyBhtuTYF6fpAqJmKpdjACGa79uJQwZuDds",
  authDomain: "subrain-united-lms-hub.firebaseapp.com",
  projectId: "subrain-united-lms-hub",
  storageBucket: "subrain-united-lms-hub.firebasestorage.app",
  messagingSenderId: "201858023369",
  appId: "1:201858023369:web:e4244cdcc9d04e9c7a7218"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
