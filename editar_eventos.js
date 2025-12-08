import { db, auth, firebase } from './firebase_connection.js'; 

console.log("Script editar_eventos.js iniciado...");

// Referências aos elementos do HTML
const divSelecao = document.getElementById('div-selecao-evento');
const divFormulario = document.getElementById('div-formulario-edicao');
const containerLista = document.getElementById('conteudo-lista');
const subtitulo = document.getElementById('subtitulo-pagina');

// --- FUNÇÃO 1: Mostrar a Lista de Eventos ---
const mostrarListaDeSelecao = async (user) => {
    console.log("Modo: Mostrar Lista de Seleção para user:", user.uid);
    
    // Troca visibilidade
    divFormulario.className = 'escondido';
    divSelecao.className = 'visivel';
    subtitulo.textContent = "Selecione um evento abaixo.";

    try {
        const snapshot = await db.collection("eventos")
            .where("responsavel_uid", "==", user.uid)
            .get();

        if (snapshot.empty) {
            containerLista.innerHTML = "<p>Não encontrei eventos criados por si.</p>";
            return;
        }

        let html = "";
        snapshot.forEach(doc => {
            const dados = doc.data();
            const id = doc.id;
            // O link recarrega a página mas adiciona ?id=...
            html += `
                <div class="lista-item">
                    <strong>${dados.nome}</strong> (${dados.data_string})
                    <a href="editar_eventos.html?id=${id}" class="btn-selecionar">Editar</a>
                </div>
            `;
        });
        containerLista.innerHTML = html;

    } catch (error) {
        console.error("Erro ao buscar lista:", error);
        containerLista.innerHTML = "<p style='color:red'>Erro ao carregar lista. Veja o console.</p>";
    }
};

// --- FUNÇÃO 2: Carregar Dados para Edição ---
const carregarFormularioEdicao = async (id) => {
    console.log("Modo: Edição do ID:", id);

    // Troca visibilidade
    divSelecao.className = 'escondido';
    divFormulario.className = 'visivel';
    subtitulo.textContent = "Edite os campos abaixo.";

    try {
        const doc = await db.collection("eventos").doc(id).get();
        if (!doc.exists) {
            alert("Evento não encontrado!");
            window.location.href = "editar_eventos.html"; // Volta para a lista
            return;
        }

        const dados = doc.data();
        
        // Preencher Inputs
        document.getElementById('nomeEvento').value = dados.nome || "";
        document.getElementById('localEvento').value = dados.local || "";
        document.getElementById('maxParticipantes').value = dados.max_participantes || 0;
        document.getElementById('dataEvento').value = dados.data_string || "";
        document.getElementById('horaEvento').value = dados.hora_string || "";
        document.getElementById('numOradores').value = dados.num_oradores || 0;
        document.getElementById('nomesOradores').value = dados.oradores ? dados.oradores.join(', ') : "";
        document.getElementById('precoNormal').value = dados.precos?.normal || 0;
        document.getElementById('precoVip').value = dados.precos?.vip || 0;

        // Configurar Botões (Atualizar e Eliminar)
        configurarBotoes(id);

    } catch (error) {
        console.error("Erro ao carregar evento:", error);
        alert("Erro ao ler dados.");
    }
};

// --- FUNÇÃO 3: Lógica dos Botões (Guardar / Eliminar) ---
const configurarBotoes = (id) => {
    const form = document.getElementById('form-criar-evento');
    const btnEliminar = document.getElementById('btn-eliminar');

    // ATUALIZAR
    form.onsubmit = async (e) => {
        e.preventDefault();
        try {
            // Captura rápida de dados para teste
            const updateData = {
                nome: document.getElementById('nomeEvento').value,
                local: document.getElementById('localEvento').value,
                max_participantes: parseInt(document.getElementById('maxParticipantes').value),
                data_string: document.getElementById('dataEvento').value,
                hora_string: document.getElementById('horaEvento').value,
                // ... adicione os outros campos aqui se precisar ...
                ultima_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection("eventos").doc(id).update(updateData);
            alert("Evento atualizado!");
            window.location.href = "editar_eventos.html"; // Volta para a lista
        } catch (error) {
            console.error(error);
            alert("Erro ao atualizar.");
        }
    };

    // ELIMINAR
    btnEliminar.onclick = async () => {
        if(confirm("Tem a certeza?")) {
            try {
                await db.collection("eventos").doc(id).delete();
                alert("Eliminado!");
                window.location.href = "editar_eventos.html";
            } catch (error) {
                console.error(error);
                alert("Erro ao eliminar.");
            }
        }
    };
};

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        // Verifica se há ID no URL
        const urlParams = new URLSearchParams(window.location.search);
        const eventoId = urlParams.get('id');

        if (eventoId) {
            // Tem ID -> Mostra Formulário
            carregarFormularioEdicao(eventoId);
        } else {
            // Não tem ID -> Mostra Lista
            mostrarListaDeSelecao(user);
        }
    });
});