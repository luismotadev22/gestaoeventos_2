import { db, auth } from "./firebase_connection.js";

// Referência global do Firebase (necessária para reautenticação na v8)
const firebase = window.firebase;

// Seleção de Elementos
const formPerfil = document.getElementById("form-perfil");
const nomeEl = document.getElementById("nome");
const emailEl = document.getElementById("email");
const statusEl = document.getElementById("status");

const formPass = document.getElementById("form-pass");
const statusPassEl = document.getElementById("status-pass");

const btnEliminar = document.getElementById("btn-eliminar");
const statusDeleteEl = document.getElementById("status-delete");

const btnLogout = document.getElementById("btn-logout");

/**
 * Funções Auxiliares de Mensagem
 */
function showMsg(el, texto, isOk = true) {
    el.textContent = texto;
    el.className = `status-msg ${isOk ? 'ok' : 'err'}`;
    el.style.display = "block";
}

/**
 * 1. Carregar Dados Iniciais
 */
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Preenche o email (está desativado no HTML)
    emailEl.value = user.email;

    try {
        const doc = await db.collection("utilizadores").doc(user.uid).get();
        if (doc.exists) {
            nomeEl.value = doc.data().nome || "";
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
});

/**
 * 2. Atualizar Nome
 */
formPerfil.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const novoNome = nomeEl.value.trim();

    try {
        await db.collection("utilizadores").doc(user.uid).set({
            nome: novoNome,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showMsg(statusEl, "Nome atualizado com sucesso! ✅");
    } catch (error) {
        showMsg(statusEl, "Erro ao atualizar nome.", false);
    }
});

/**
 * 3. Alterar Password (Reautenticação Obrigatória)
 */
formPass.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    const atual = document.getElementById("pass-atual").value;
    const nova = document.getElementById("pass-nova").value;
    const conf = document.getElementById("pass-confirmar").value;

    if (nova !== conf) {
        showMsg(statusPassEl, "As novas passwords não coincidem.", false);
        return;
    }

    if (nova.length < 6) {
        showMsg(statusPassEl, "A nova password deve ter mais de 6 caracteres.", false);
        return;
    }

    try {
        // Criar credencial para confirmar que é o dono da conta
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, atual);
        
        // Reautenticar
        await user.reauthenticateWithCredential(credential);
        
        // Atualizar Password
        await user.updatePassword(nova);

        showMsg(statusPassEl, "Password alterada com sucesso! ✅");
        formPass.reset();
    } catch (error) {
        console.error(error);
        if (error.code === "auth/wrong-password") {
            showMsg(statusPassEl, "A password atual está incorreta.", false);
        } else if (error.code === "auth/requires-recent-login") {
            showMsg(statusPassEl, "Sessão expirada. Faz logout e login novamente.", false);
        } else {
            showMsg(statusPassEl, "Erro ao alterar password.", false);
        }
    }
});

/**
 * 4. Eliminar Conta
 */
btnEliminar.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!confirm("AVISO: Esta ação é permanente. Desejas eliminar a tua conta?")) return;

    try {
        // 1. Apagar dados no Firestore
        await db.collection("utilizadores").doc(user.uid).delete();
        
        // 2. Apagar utilizador no Auth
        await user.delete();
        
        window.location.href = "login.html";
    } catch (error) {
        console.error(error);
        if (error.code === "auth/requires-recent-login") {
            alert("Por segurança, deves fazer login novamente antes de eliminar a conta.");
            auth.signOut().then(() => window.location.href = "login.html");
        } else {
            showMsg(statusDeleteEl, "Erro ao eliminar conta.", false);
        }
    }
});

/**
 * 5. Logout
 */
btnLogout.addEventListener("click", () => {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
});