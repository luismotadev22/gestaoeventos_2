import { db, auth, firebase } from './firebase_connection.js'; 

console.log("Script editar_eventos.js iniciado...");

// Chama os elementos HTML pelo ID para poderem ser manipulados
const divSelecao = document.getElementById('div-selecao-evento');
const divFormulario = document.getElementById('div-formulario-edicao');
const containerLista = document.getElementById('conteudo-lista');
const subtitulo = document.getElementById('subtitulo-pagina');
const form = document.getElementById('form-criar-evento'); // Referência global para o form

// ===============================================
// --- FUNÇÕES DE UTENSÍLIOS / POPUPS ---
// ===============================================

function mostrarPopupInfo(mensagem, callback = null) { // cria a funçao para mostrar popup
    document.getElementById("popupMensagem").textContent = mensagem; // vai buscar o elmento id e coloca a mensagem la dentro
    const popup = document.getElementById("popup-info"); // cria uma variavel costante popup-info para mostrar o popup

    popup.classList.remove("escondido"); // remove a classe escondido para mostrar o popup

    document.getElementById("btnFecharPopup").onclick = () => { // cria a funçao para fechar o popup
        popup.classList.add("escondido"); // adiciona a classe escondido para esconder o popup 
        if (callback) callback(); // se houver um callback, executa-o, serve para redirecionar apos fechar o popup
    };
};


function showNotification(mensagem, tipo = 'info') { // tipo pode ser 'info' ou 'error'
    const notificacao = document.getElementById('notificacao-box') || document.createElement('div'); // procura no html se existe a div notificacao-box ou cria uma nova div

// Se a notificação ainda não estiver no DOM, adiciona-a
    if (!document.getElementById('notificacao-box')) { 
        notificacao.id = 'notificacao-box';
        // Adicionar estilos básicos para que a notificação apareça (recomenda-se CSS dedicado)
        notificacao.style.position = 'fixed';
        notificacao.style.top = '10px';
        notificacao.style.right = '10px';
        notificacao.style.padding = '15px';
        notificacao.style.borderRadius = '5px';
        notificacao.style.zIndex = '10000';
        notificacao.style.color = 'white';
        document.body.appendChild(notificacao);
    }
    
    // Define a cor com base no tipo
    notificacao.style.backgroundColor = (tipo === 'error') ? '#dc3545' : '#007bff';  // manipular elemento dom notificacao-box
    notificacao.textContent = mensagem;
    notificacao.style.display = 'block';

    // Esconde automaticamente após 5 segundos
    clearTimeout(notificacao.timer);
    notificacao.timer = setTimeout(() => {
        notificacao.style.display = 'none';
    }, 5000);
}


// ===============================================
// --- FUNÇÃO 1: Mostrar a Lista de Eventos --- (Mantida)
// ===============================================

const mostrarListaDeSelecao = async (user) => {
    // ... (código da função mostrarListaDeSelecao mantido) ...
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
// --- FUNÇÃO 2: CARREGAR FORMULÁRIO PARA EDIÇÃO --- (Mantida)
// ===============================================

const carregarFormularioEdicao = async (eventoId) => {
    // ... (código da função carregarFormularioEdicao mantido) ...
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
// --- FUNÇÃO 3: CONFIGURAR BOTÕES (COM VALIDAÇÃO INTEGRADA) ---
// ===============================================

const configurarBotoes = (id) => {
    // Referências
    const btnEliminar = document.getElementById('btn-eliminar');
    const btnGuardar = form.querySelector('.btn-submeter'); 

    // ===========================================
    // FUNÇÃO AUXILIAR: COLETAR E PREPARAR DADOS (Mantida)
    // ===========================================
    const getFormData = () => {
        const dataStr = document.getElementById('dataEvento').value;
        const horaStr = document.getElementById('horaEvento').value;
        const nomesOradoresTexto = document.getElementById('nomesOradores').value;
        const num_oradores = parseInt(document.getElementById('numOradores').value) || 0;
        const precoNormal = parseFloat(document.getElementById('precoNormal').value) || 0; 
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
    // 1. AÇÃO DE GUARDAR / ATUALIZAR (COM VALIDAÇÃO)
    // ===========================================
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        btnGuardar.disabled = true;
        const textoOriginal = btnGuardar.textContent;
        btnGuardar.textContent = "A Guardar...";
        
        const updateData = getFormData();
        let mensagemErro = "";

        // Desestruturação para facilitar a validação
        const { nome, local, max_participantes, data_string, hora_string, precos } = updateData;
        const precoNormal = precos.normal;
        
        // --- LÓGICA DE VALIDAÇÃO SOLICITADA ---
       if (!nome) {
            mensagemErro = "O Nome do Evento é obrigatório.";
        } else if (!local) {
            mensagemErro = "A Localização / Morada é obrigatória.";
        } else if (isNaN(max_participantes) || max_participantes <= 0) {
            mensagemErro = "O Máximo de Participantes deve ser um número válido e positivo.";
        } else if (!data_string) {
            mensagemErro = "A Data do Evento é obrigatória.";
        } else if (!hora_string) {
            mensagemErro = "A Hora do Evento é obrigatória.";
        } else if (isNaN(num_oradores) || num_oradores < 0) { 
            // ^-- NOVA REGRA DE VALIDAÇÃO
            mensagemErro = "O Número de Oradores deve ser um número válido e não negativo (0 ou mais).";
        } else if (isNaN(precoNormal) || precoNormal <= 0) {
            mensagemErro = "O Preço Bilhete Normal deve ser um valor válido e positivo.";
        }
        // SE HOUVER ERRO DE VALIDAÇÃO: Pára o processo e notifica o utilizador.
        if (mensagemErro) {
            // Reativa o botão e mostra a notificação de erro
            btnGuardar.textContent = textoOriginal;
            btnGuardar.disabled = false;
            
            showNotification(` Erro de Validação: ${mensagemErro}`, 'error');
            return; // *** Pára a submissão AQUI. ***
        }
        // --- FIM DA VALIDAÇÃO ---


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
    // 2. AÇÃO DE ELIMINAR (Pop-up Personalizado) (Mantida)
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