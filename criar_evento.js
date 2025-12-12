import { db, auth, firebase } from './firebase_connection.js'; // Garante que 'firebase' é importado

document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('form-criar-evento');

    // Verificar se o utilizador está autenticado (Lógica de redirecionamento)
    auth.onAuthStateChanged((user) => {
        if (!user) {
            alert("Precisa de estar logado para criar eventos.");
            window.location.href = "login.html";
        }
    });


function setValidacaoNumero(input, min, msg) {
    input.addEventListener('input', () => {
        const valor = input.value.trim();

        // reset
        input.setCustomValidity("");

        if (valor === "") {
            if (input.hasAttribute('required')) {
                input.setCustomValidity("Por favor, preencha este campo.");
            }
        } else if (!isNaN(parseFloat(valor)) && parseFloat(valor) < min) {
            input.setCustomValidity(msg);
        } else {
            input.setCustomValidity(""); // válido
        }

        // Atualiza a mensagem visual imediatamente
        input.reportValidity();
    });
}

    // Captura os inputs
    const maxParticipantes = document.getElementById('maxParticipantes');
    const numOradores = document.getElementById('numOradores');
    const precoNormal = document.getElementById('precoNormal');
    const precoVip = document.getElementById('precoVip');

    // Configura validação personalizada
    
    setValidacaoNumero(maxParticipantes, 1, "O máximo de participantes deve ser pelo menos 1.");
    setValidacaoNumero(numOradores, 0, "O número de oradores não pode ser negativo.");
    setValidacaoNumero(precoNormal, 0, "O preço normal não pode ser negativo.");
    setValidacaoNumero(precoVip, 0, "O preço VIP não pode ser negativo.");

    

    // Submeter o Formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) return;

        // 1. Capturar valores dos campos GERAIS
        const nome = document.getElementById('nomeEvento').value;
        const local = document.getElementById('localEvento').value;
        const maxParticipantes = parseInt(document.getElementById('maxParticipantes').value);

        // Data e Hora combinadas
        const dataStr = document.getElementById('dataEvento').value;
        const horaStr = document.getElementById('horaEvento').value;
        const dataHoraCombinada = new Date(`${dataStr}T${horaStr}`);

        // Oradores
        const numOradores = parseInt(document.getElementById('numOradores').value) || 0;

        let mensagemErro = null;

        if (numOradores < 0) {
            mensagemErro = "O número de oradores não pode ser negativo.";
        }

        const nomesOradoresTexto = document.getElementById('nomesOradores').value;

        // --- Captura dos Preços (Normal e VIP) ---
        const precoNormal = parseFloat(document.getElementById('precoNormal').value);

        const precoVipInput = document.getElementById('precoVip').value;
        const precoVip = precoVipInput !== "" ? parseFloat(precoVipInput) : null;

        // Transformar string de oradores num Array
        const listaOradores = nomesOradoresTexto.split(',').map(nome => nome.trim()).filter(n => n !== "");

        // 2. Criar Objeto do Evento (Estrutura Atualizada)
        const novoEvento = {
            nome: nome,
            local: local,
            max_participantes: maxParticipantes,
            
            // Oradores Reintegrados
            num_oradores: numOradores,
            oradores: listaOradores,
            
            data_inicio: firebase.firestore.Timestamp.fromDate(dataHoraCombinada),
            data_string: dataStr, 
            hora_string: horaStr,
            
            // FORMATO DE PREÇOS
            precos: {
                normal: precoNormal,
                vip: precoVip
            },

            responsavel_uid: user.uid, 
            estado: "ativo",
            inscritos_atuais: 0,
            criado_em: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 3. Enviar para o Firestore
        try {
            const btn = document.querySelector('.btn-submeter');
            const textoOriginal = btn.textContent;
            
            btn.textContent = "A publicar...";
            btn.disabled = true;
            if (!nome) {
                mensagemErro = "O Nome do Evento é obrigatório.";
            } else if (!local) {
                mensagemErro = "A Localização / Morada é obrigatória.";
            } else if (isNaN(maxParticipantes) || maxParticipantes <= 0) {
                mensagemErro = "O Máximo de Participantes deve ser um número válido e positivo.";
            } else if (!dataStr) {
                mensagemErro = "A Data do Evento é obrigatória.";
            } else if (!horaStr) {
                mensagemErro = "A Hora do Evento é obrigatória.";
            } else if (isNaN(precoNormal) || precoNormal <= 0) {
                mensagemErro = "O Preço Bilhete Normal deve ser um valor válido e positivo.";
            }

            // SE HOUVER ERRO DE VALIDAÇÃO: Pára o processo e notifica o utilizador.
            if (mensagemErro) {
                showNotification(`🛑 Erro de Validação: ${mensagemErro}`, 'error');
                return; // *** Pára a submissão AQUI. ***
            }

            await db.collection("eventos").add(novoEvento);

            //alert("Sucesso! O evento foi criado e publicado.");
            window.location.href = "dashboard.html"; 

        } catch (error) {
            console.error("Erro ao criar evento:", error);
            alert("Erro ao criar o evento: " + error.message);
            
            const btn = document.querySelector('.btn-submeter');
            btn.textContent = textoOriginal; 
            btn.disabled = false;
        }
    }); 
    
}); // Fecho do DOMContentLoaded