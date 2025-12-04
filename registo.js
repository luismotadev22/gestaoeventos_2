import { auth, db, firebase } from './firebase_connection.js'; 

document.addEventListener('DOMContentLoaded', () => {
    // Obter referências dos elementos do DOM
    const formRegisto = document.getElementById('form-registo');
    const emailInput = document.getElementById('registo-email');
    const passwordInput = document.getElementById('registo-password');
    const confirmPasswordInput = document.getElementById('registo-password2');
    const mensagemFeedback = document.getElementById('mensagem-registo');

    if (!formRegisto) {
        console.error("ERRO: Formulário de registo não encontrado. Verifique o ID 'form-registo'.");
        return;
    }

    formRegisto.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        // Limpar feedback e estilos anteriores
        mensagemFeedback.textContent = '';
        mensagemFeedback.classList.remove('sucesso', 'erro');

        // Obter e limpar os valores dos campos
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const perfilInput = document.querySelector('input[name="perfil"]:checked');
        const perfil = perfilInput ? perfilInput.value : null;

        // --- VALIDAÇÕES ---
        if (!perfil) {
            mensagemFeedback.textContent = 'Erro: Por favor, selecione o tipo de conta (Participante/Organizador).';
            mensagemFeedback.classList.add('erro');
            return;
        }

        if (!email.endsWith('@ipca.pt') && !email.endsWith('@alunos.ipca.pt')) {
            mensagemFeedback.textContent = 'Erro: O e-mail deve ser institucional (@ipca.pt ou @alunos.ipca.pt).';
            mensagemFeedback.classList.add('erro');
            emailInput.focus();
            return;
        }

        if (password.length < 6) {
            mensagemFeedback.textContent = 'Erro: A palavra-passe deve ter pelo menos 6 caracteres.';
            mensagemFeedback.classList.add('erro');
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            mensagemFeedback.textContent = 'Erro: As palavras-passe não coincidem. Por favor, verifique.';
            mensagemFeedback.classList.add('erro');
            confirmPasswordInput.focus();
            return;
        }
        // --- FIM VALIDAÇÕES ---

        mensagemFeedback.textContent = 'A processar registo...';
        
        try {
            // 1. CRIAR CONTA NO FIREBASE AUTHENTICATION
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. ARMAZENAR DADOS ADICIONAIS NO FIRESTORE (Perfil)
            await db.collection("utilizadores").doc(user.uid).set({
                email: email,
                perfil: perfil, 
                // CORREÇÃO: Usa o objeto 'firebase' importado para obter o FieldValue
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. Sucesso e Redirecionamento
            mensagemFeedback.textContent = `Conta de ${perfil.toUpperCase()} criada com sucesso! Redirecionando para Iniciar Sessão...`;
            mensagemFeedback.classList.add('sucesso');

            formRegisto.reset();

            setTimeout(() => {
                window.location.href = './login.html';
            }, 2000);

        } catch (error) {
            // Tratamento de Erros do Firebase
            console.error("Erro no registo Firebase:", error);

            let mensagemErro = 'Erro desconhecido ao registar.';
            if (error.code === 'auth/email-already-in-use') {
                mensagemErro = 'Erro: Este e-mail já está registado. Tente iniciar sessão.';
            } else if (error.code === 'auth/weak-password') {
                mensagemErro = 'Erro: A senha é demasiado fraca (mínimo 6 caracteres).';
            } else if (error.code === 'auth/invalid-email') {
                mensagemErro = 'Erro: O endereço de e-mail não é válido.';
            }

            mensagemFeedback.textContent = mensagemErro;
            mensagemFeedback.classList.add('erro');
        }
    });
});