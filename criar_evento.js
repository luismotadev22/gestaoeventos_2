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

            await db.collection("eventos").add(novoEvento);

            alert("Sucesso! O evento foi criado e publicado.");
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