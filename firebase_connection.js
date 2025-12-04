const firebaseConfig = {
    apiKey: "AIzaSyBHTz0tbFJimicYb0B1BliYri8UnOU4TbU",
    authDomain: "gestao-de-eventos-6e233.firebaseapp.com",
    projectId: "gestao-de-eventos-6e233",
    storageBucket: "gestao-de-eventos-6e233.firebasestorage.app",
    messagingSenderId: "827762757876",
    appId: "1:827762757876:web:c7a4fffed891b523460ea1",
};

// Inicializar o Firebase App 
const app = firebase.initializeApp(firebaseConfig);

// Inicializar e EXPORTAR os Serviços Essenciais
const db = app.firestore(); 
const auth = app.auth(); 
const firebaseGlobal = firebase;



export { db, auth, firebaseGlobal as firebase };