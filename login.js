import { auth, db } from './firebase_connection.js';

document.addEventListener('DOMContentLoaded', () => {
    //  Obtem os elementos do HTML
    const formLogin = document.getElementById('form-login');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const mensagemErro = document.getElementById('mensagem-erro');
    
    if (!formLogin) {
        console.error("ERRO: Formulário de login (ID: form-login) não encontrado.");
        return;
    }

    formLogin.addEventListener('submit', async (evento) => { // MUDANÇA: 'async' é necessário para as chamadas Firebase
        evento.preventDefault(); 
        
        // Limpar mensagens de erro
        mensagemErro.textContent = '';
        mensagemErro.classList.remove('erro', 'sucesso');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // VALIDAÇÃO BÁSICA
        if (!email || !password) {
            mensagemErro.textContent = 'Erro: Por favor, preencha todos os campos.';
            mensagemErro.classList.add('erro');
            return;
        }

        // --- 1. CHAMAR A AUTENTICAÇÃO DO FIREBASE ---
        try {
            mensagemErro.textContent = 'A iniciar sessão...';
            mensagemErro.classList.add('sucesso');
            
            // Tenta iniciar sessão com Email e Password
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // --- 2. BUSCAR O PERFIL NO FIRESTORE ---
            // Usamos o UID do utilizador recém-logado para obter os seus dados (incluindo o perfil)
            const docRef = db.collection("utilizadores").doc(user.uid);
            const doc = await docRef.get(); // Assíncrono

            if (doc.exists) {
                const perfil = doc.data().perfil;
                
                // NOTA: JÁ NÃO É NECESSÁRIO O LOCAL STORAGE para 'Utilizador Logado' ou 'Perfil Utilizador'.
                // O dashboard agora usa 'auth.onAuthStateChanged' e Firestore.

                // Marcar a sessão como ativa e guardar o perfil do utilizador encontrado
                // *OPCIONAL*: Manter apenas o perfil no Local Storage se for usado em partes do código não-migradas
                // localStorage.setItem('Perfil Utilizador', perfil); 
                
                // Feedback de sucesso
                mensagemErro.textContent = `Login bem-sucedido! Bem-vindo(a) ${perfil}. Acedendo ao Dashboard...`;
                
                // 3. Redirecionar para o Dashboard
                setTimeout(() => {
                    window.location.href = './dashboard.html'; 
                }, 1500);

            } else {
                // Se o login funcionar, mas não houver documento de perfil (inconsistência de dados)
                mensagemErro.textContent = 'Erro de dados: Perfil de utilizador não encontrado no sistema.';
                mensagemErro.classList.add('erro');
                // É boa prática forçar o logout do Firebase neste caso
                await auth.signOut();
            }

        } catch (error) {
            // --- TRATAMENTO DE ERROS DO FIREBASE ---
            
            let msg = 'Erro: Ocorreu um erro desconhecido.';
            
            // Mapeamento dos códigos de erro comuns do Firebase
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credentials':
                    msg = 'Erro: E-mail ou palavra-passe inválida. Tente novamente.';
                    break;
                case 'auth/invalid-email':
                    msg = 'Erro: O formato do E-mail é inválido.';
                    break;
                case 'auth/user-disabled':
                    msg = 'Erro: A sua conta foi desativada.';
                    break;
                case 'auth/invalid-login-credentials':
                    msg = 'Erro: E-mail ou palavra-passe inválida. Tente novamente.';
                default:
                    msg = `Erro de login: Email ou Password incorreto. Tente novamente.  `;
            }

            mensagemErro.textContent = msg;
            mensagemErro.classList.add('erro');
        }
    });
});