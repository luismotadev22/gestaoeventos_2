import { db, auth, firebase } from './firebase_connection.js'; 

console.log("Script editar_eventos.js iniciado...");

// Referências aos elementos do HTML
const divSelecao = document.getElementById('div-selecao-evento');
const divFormulario = document.getElementById('div-formulario-edicao');
const containerLista = document.getElementById('conteudo-lista');
const subtitulo = document.getElementById('subtitulo-pagina');
const form = document.getElementById('form-criar-evento'); // Referência global para o form

// ===============================================
// --- FUNÇÕES DE UTENSÍLIOS / POPUPS (mantidas) ---
// ===============================================

function mostrarPopupInfo(mensagem, callback = null) {
    document.getElementById("popupMensagem").textContent = mensagem;
    const popup = document.getElementById("popup-info");

    popup.classList.remove("escondido");

    document.getElementById("btnFecharPopup").onclick = () => {
        popup.classList.add("escondido");
        if (callback) callback();
    };
};

// ===============================================
// --- FUNÇÃO 1: Mostrar a Lista de Eventos (mantida) ---
// ===============================================

const mostrarListaDeSelecao = async (user) => {
    console.log("Modo: Mostrar Lista de Seleção para user:", user.uid);
    
    // Troca visibilidade
    divFormulario.className = 'escondido';
    divSelecao.className = 'visivel';
    subtitulo.textContent = "Selecione um evento abaixo para editar.";

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
            
            // CORREÇÃO: Adicionei a data à lista para melhor visualização
            html += `
                <div class="lista-item">
                    <a href="editar_eventos.html?id=${id}" class="evento-link-lista">
                        <strong>${dados.nome}</strong> 
                        <span class="data-evento">Data: ${dados.data_string || 'N/A'}</span>
                    </a> 
                </div>
            `;
        });
        containerLista.innerHTML = html;

    } catch (error) {
        console.error("Erro ao buscar lista:", error);
        mostrarPopupInfo("Erro ao carregar lista de eventos.");
    }
};


// ===============================================
// --- FUNÇÃO 2: CARREGAR FORMULÁRIO PARA EDIÇÃO (NOVA E ESSENCIAL!) ---
// ===============================================

const carregarFormularioEdicao = async (eventoId) => {
    console.log("Modo: Carregar Formulário para ID:", eventoId);

    // Troca visibilidade
    divSelecao.className = 'escondido';
    divFormulario.className = 'visivel';
    subtitulo.textContent = `A editar Evento: ${eventoId}`; // Será atualizado com o nome real

    try {
        const doc = await db.collection("eventos").doc(eventoId).get();

        if (!doc.exists) {
            mostrarPopupInfo("Evento não encontrado!", () => {
                 window.location.href = "editar_eventos.html";
            });
            return;
        }

        const dados = doc.data();
        
        // Preencher os campos do formulário
        document.getElementById('nomeEvento').value = dados.nome || '';
        document.getElementById('localEvento').value = dados.local || '';
        document.getElementById('maxParticipantes').value = dados.max_participantes || '';
        document.getElementById('dataEvento').value = dados.data_string || ''; 
        document.getElementById('horaEvento').value = dados.hora_string || '';

        document.getElementById('numOradores').value = dados.num_oradores || '';
        // Converte o array de oradores de volta para uma string separada por vírgulas
        document.getElementById('nomesOradores').value = dados.oradores ? dados.oradores.join(', ') : '';

        // Preços
        document.getElementById('precoNormal').value = dados.precos && dados.precos.normal !== undefined ? dados.precos.normal : '';
        document.getElementById('precoVip').value = dados.precos && dados.precos.vip !== undefined && dados.precos.vip !== null ? dados.precos.vip : '';

        // Atualizar subtítulo com o nome real
        subtitulo.textContent = `A editar Evento: ${dados.nome}`;

        // Configurar os botões de Guardar e Eliminar para este ID específico
        configurarBotoes(eventoId);

    } catch (error) {
        console.error("Erro ao carregar dados do evento:", error);
        mostrarPopupInfo("Não foi possível carregar os dados do evento.");
    }
};


// ===============================================
// --- FUNÇÃO 3: CONFIGURAR BOTÕES (Guardar/Eliminar) ---
// ===============================================
// O código desta função está correto e foi mantido, mas é necessário o 'form' globalmente
// ou passá-lo como parâmetro para 'configurarBotoes'.

const configurarBotoes = (id) => {
    // Referências já estavam corretas dentro desta função, mas usei o form global para consistência.
    const btnEliminar = document.getElementById('btn-eliminar');
    const btnGuardar = form.querySelector('.btn-submeter'); 

    // ... (restante do código getFormData e form.onsubmit mantido como estava na sua correção) ...

    // ===========================================
    // FUNÇÃO AUXILIAR: COLETAR E PREPARAR DADOS
    // ===========================================
    const getFormData = () => {
        const dataStr = document.getElementById('dataEvento').value;
        const horaStr = document.getElementById('horaEvento').value;
        const nomesOradoresTexto = document.getElementById('nomesOradores').value;
        
        const listaOradores = nomesOradoresTexto.split(',').map(n => n.trim()).filter(n => n !== "");
        
        const precoVipInput = document.getElementById('precoVip').value;
        const precoVipValor = precoVipInput.trim() !== "" ? parseFloat(precoVipInput) : null;
        
        const dataHoraCombinada = new Date(`${dataStr}T${horaStr}`);
        
        return {
            nome: document.getElementById('nomeEvento').value.trim(),
            local: document.getElementById('localEvento').value.trim(),
            max_participantes: parseInt(document.getElementById('maxParticipantes').value) || 0,
            num_oradores: parseInt(document.getElementById('numOradores').value) || 0,
            oradores: listaOradores,
            data_string: dataStr, 
            hora_string: horaStr,
            data_inicio: firebase.firestore.Timestamp.fromDate(dataHoraCombinada), 
            precos: {
                normal: parseFloat(document.getElementById('precoNormal').value) || 0,
                vip: precoVipValor
            }
        };
    };


    // ===========================================
    // 1. AÇÃO DE GUARDAR / ATUALIZAR
    // ===========================================
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        btnGuardar.disabled = true;
        const textoOriginal = btnGuardar.textContent;
        btnGuardar.textContent = "A Guardar...";
        
        const updateData = getFormData();
        
        try {
            await db.collection("eventos").doc(id).update(updateData);

            mostrarPopupInfo("Evento atualizado com sucesso!", () => {
                window.location.href = "editar_eventos.html";
            });

        } catch (error) {
            console.error("Erro ao atualizar o evento:", error);
            mostrarPopupInfo("Erro ao atualizar. Verifique se os campos estão corretos.");
            btnGuardar.textContent = textoOriginal;
            btnGuardar.disabled = false;
        }
    };


    // ===========================================
    // 2. AÇÃO DE ELIMINAR (Pop-up Personalizado)
    // ===========================================
    btnEliminar.onclick = () => {
        const popupConfirm = document.getElementById("popup-confirm");
        popupConfirm.classList.remove("escondido");

        document.getElementById("btnCancelarEliminar").onclick = () => {
            popupConfirm.classList.add("escondido");
        };

        document.getElementById("btnConfirmarEliminar").onclick = async () => {
            try {
                await db.collection("eventos").doc(id).delete();
                popupConfirm.classList.add("escondido");

                mostrarPopupInfo("Evento eliminado com sucesso!", () => {
                    window.location.href = "editar_eventos.html";
                });

            } catch (error) {
                console.error(error);
                mostrarPopupInfo("Erro ao eliminar o evento.");
                popupConfirm.classList.add("escondido");
            }
        };
    };
};


// ===============================================
// --- LÓGICA PRINCIPAL (Mantida) ---
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const eventoId = urlParams.get('id');

        if (eventoId) {
            // TEM ID -> CHAMA A NOVA FUNÇÃO
            carregarFormularioEdicao(eventoId);
        } else {
            // NÃO TEM ID -> CHAMA A LISTA
            mostrarListaDeSelecao(user);
        }
    });
});