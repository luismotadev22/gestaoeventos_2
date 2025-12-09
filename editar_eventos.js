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
            
            // ⚠️ CORREÇÃO 1: Corrigida a sintaxe da template string (era $(dados.nome} e faltava fechar parênteses)
            // Agora, o nome do evento e a data estão corretamente dentro do link <a>.
            html += `
                <div class="lista-item">
                    <a href="editar_eventos.html?id=${id}" class="evento-link-lista">
                        <strong>${dados.nome}</strong>  </a> (${dados.data_string})
               
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
    subtitulo.textContent = "Edite os campos abaixo do seu evento.";

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
        
        // ⚠️ CORREÇÃO 2: Se data_string estiver no formato DD/MM/AAAA, o input type="date"
        // espera AAAA-MM-DD. Assumindo que a data no Firestore é ISO (AAAA-MM-DD),
        // este código está ok, mas se não for, causará um erro de preenchimento.
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

// FUNÇÃO 3: Lógica dos Botões (Guardar / Eliminar) 
const configurarBotoes = (id) => {
    const form = document.getElementById('form-criar-evento');
    const btnEliminar = document.getElementById('btn-eliminar');

    // Função para guardar e atualizar o codigo
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Lógica para Oradores
        const nomesOradoresTexto = document.getElementById('nomesOradores').value;
        // Limpa espaços e divide por vírgula para criar um array para o Firestore
        const oradoresArray = nomesOradoresTexto
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0); 
            
        try {
            // ⚠️ CORREÇÃO 3: Adicionados os campos 'num_oradores' e 'oradores' ao objeto de atualização.
            const updateData = {
                nome: document.getElementById('nomeEvento').value,
                local: document.getElementById('localEvento').value,
                max_participantes: parseInt(document.getElementById('maxParticipantes').value),
                data_string: document.getElementById('dataEvento').value,
                hora_string: document.getElementById('horaEvento').value,
                num_oradores: parseInt(document.getElementById('numOradores').value) || 0,
                oradores: oradoresArray, // Array de oradores corrigido
                precos: {
                    normal: parseFloat(document.getElementById('precoNormal').value),
                    vip: parseFloat(document.getElementById('precoVip').value) || null
                },
                ultima_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Certifica-se de que se o VIP for 0, ele salva como null/undefined para economizar espaço
            if (updateData.precos.vip === 0) {
                 updateData.precos.vip = null;
            }


            await db.collection("eventos").doc(id).update(updateData);
            alert("Evento atualizado!");
            window.location.href = "editar_eventos.html"; // Volta para a lista
        } catch (error) {
            console.error(error);
            alert("Erro ao atualizar. Verifique se os campos de número/preço estão corretos.");
        }
    };

    // ELIMINAR
    btnEliminar.onclick = async () => {
        if(confirm("Tem a certeza que deseja eliminar este evento? Esta ação é irreversível.")) {
            try {
                await db.collection("eventos").doc(id).delete();
                alert("Evento Eliminado com sucesso!");
                window.location.href = "editar_eventos.html";
            } catch (error) {
                console.error(error);
                alert("Erro ao eliminar o evento.");
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