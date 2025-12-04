import { auth, db } from './firebase_connection.js';

// ESTA FUNÇÃO PERMANECE INALTERADA (APENAS SIMULAÇÃO DE DADOS ESTÁTICOS)
function obterDadosDoUtilizador(perfil, email) {
    if (perfil === 'organizador') {
        return {
            totalArrecadado: 14720.50,
            inscricoesTotais: 412,
            eventosAtivos: 7, 
            notificacoes: 2 
        };
    } 
    
    else if (perfil === 'participante') {
        return {
            proximoEvento: {
                nome: "Workshop de Design Thinking",
                data: "10/12/2025",
                local: "Sala B1.04",
                orador: "Prof. Maria Sousa"
            },
            bilhetes: {
                total: 3,
                vip: 1,
                normal: 2,
                gastoTotal: 85.55
            },
            notificacoes: 5
        };
    }
    return {}; 
}


// NOVO: Função para encapsular toda a lógica de renderização original (Passos 3 a 9)
function carregarConteudoDashboard(perfil, emailCompleto) {
    
    // Obter o nome base do email (para a saudação dinâmica)
    const nomeBase = emailCompleto.split('@')[0];

    // --- 3. OBTER "PONTOS DE INJEÇÃO" DO HTML ---
    const menuContainer = document.getElementById('menu-principal-dinamico');
    const conteudoContainer = document.getElementById('conteudo-principal-dinamico');
    const nomeUtilizadorEl = document.getElementById('display-nome-utilizador');
    const perfilUtilizadorEl = document.getElementById('display-perfil-utilizador');
    const tituloHeaderEl = document.getElementById('display-header-titulo');
    const subtituloHeaderEl = document.getElementById('display-header-subtitulo');
    const logoLink = document.getElementById('logo-link');


    // **VERIFICAÇÃO CRÍTICA:** Se o perfil for inválido, paramos.
    if (!perfil || (perfil !== 'organizador' && perfil !== 'participante')) {
        tituloHeaderEl.textContent = 'ERRO DE PERFIL';
        subtituloHeaderEl.textContent = 'O tipo de perfil (' + perfil + ') é inválido ou nulo. Verifique o login.';
        console.error('ERRO CRÍTICO: Perfil do Utilizador não é "organizador" nem "participante".');
        return; 
    }
    
    // Definir o link do logo (requisito)
    logoLink.href = 'dashboard.html';

    // --- 4. OBTER DADOS DA "BASE DE DADOS" ---
    const dados = obterDadosDoUtilizador(perfil, emailCompleto);

    // --- 5. CONSTRUÇÃO DINÂMICA (O "IF/ELSE") ---
    let menuHTML = '';
    let conteudoHTML = '';

    if (perfil === 'organizador') {
        // CORREÇÃO: Usar nomeBase dinâmico
        tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
        subtituloHeaderEl.textContent = 'Crie os melhores eventos, workshops e conferências do IPCA!';
        
        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Início (Dashboard)</span></a>
            <a href="criar_evento.html" class="menu-item"><i class="fas fa-plus-circle"></i><span>Criar Evento</span></a>
            <a href="gerir_eventos.html" class="menu-item"><i class="fas fa-edit"></i><span>Gerir Eventos</span></a>
            <a href="relatorios.html" class="menu-item"><i class="fas fa-chart-line"></i><span>Relatórios & Vendas</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        conteudoHTML = `
            <div class="widget">
                <h3>Total Arrecadado (€)</h3>
                <p class="widget-numero widget-dinheiro">${dados.totalArrecadado.toLocaleString('pt-PT', {
                    style: 'currency',
                    currency: 'EUR'
                })}</p>
                <p class="widget-detalhe">Receita bruta total (Bilhetes Normal e VIP).</p>
            </div>
            <div class="widget">
                <h3>Inscrições Totais</h3>
                <p class="widget-numero">${dados.inscricoesTotais}</p>
                <p class="widget-detalhe">Total de participantes em todos os eventos.</p>
            </div>
            <div class="widget">
                <h3>Inscritos (Eventos Ativos)</h3>
                <p class="widget-numero">${dados.eventosAtivos}</p>
                <p class="widget-detalhe">Inscritos em eventos no período de vendas.</p>
            </div>
            <div class="widget">
                <h3>Notificações</h3>
                <p class="widget-numero">${dados.notificacoes}</p>
                <p class="widget-detalhe">Alertas e pendências não lidas.</p>
            </div>
            <div class="widget widget-cta">
                <h3>Pronto para o próximo evento?</h3>
                <p class="widget-detalhe">Comece a configurar a sua próxima conferência ou workshop.</p>
                <a href="criar_evento.html" class="btn btn-primario"><i class="fas fa-plus-circle"></i> Criar Novo Evento</a>
            </div>
        `;

    } else if (perfil === 'participante') {
        // CORREÇÃO: Usar nomeBase dinâmico
        tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
        subtituloHeaderEl.textContent = 'Participe nos melhores eventos, workshops e conferências do IPCA!';
        
        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Início (Dashboard)</span></a>
            <a href="explorar_eventos.html" class="menu-item"><i class="fas fa-search"></i><span>Explorar Eventos</span></a>
            <a href="minhas_inscricoes.html" class="menu-item"><i class="fas fa-ticket-alt"></i><span>As Minhas Inscrições</span></a>
            <a href="eventos_favoritos.html" class="menu-item"><i class="fas fa-star"></i><span>Eventos Favoritos</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        conteudoHTML = `
            <div class="widget">
                <h3>Próximo Evento</h3>
                <p class="widget-titulo-destaque">${dados.proximoEvento.nome}</p>
                <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> Data: ${dados.proximoEvento.data}</p>
                <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> Local: ${dados.proximoEvento.local}</p>
                <p class="widget-detalhe"><i class="fas fa-microphone"></i> Orador: ${dados.proximoEvento.orador}</p>
            </div>
            <div class="widget">
                <h3>Os Meus Bilhetes</h3>
                <p class="widget-numero">${dados.bilhetes.total}</p>
                <p class="widget-detalhe">Total (VIP: ${dados.bilhetes.vip} | Normal: ${dados.bilhetes.normal})</p>
                <p class="widget-numero widget-dinheiro">${dados.bilhetes.gastoTotal.toLocaleString('pt-PT', {
                    style: 'currency',
                    currency: 'EUR'
                })}</p>
                <p class="widget-detalhe">Gasto total</p>
            </div>
            <div class="widget">
                <h3>Notificações</h3>
                <p class="widget-numero">${dados.notificacoes}</p>
                <p class="widget-detalhe">Alertas e lembretes não lidos.</p>
            </div>
            <div class="widget widget-cta">
                <h3>Descubra a sua próxima experiência</h3>
                <p class="widget-detalhe">Encontre conferências, workshops e seminários na sua área.</p>
                <a href="explorar_eventos.html" class="btn btn-primario"><i class="fas fa-search"></i> Explorar Eventos</a>
            </div>
        `;
    }

    // --- 6. INJETAR O CONTEÚDO NO HTML ---
    if (menuContainer) menuContainer.innerHTML = menuHTML;
    if (conteudoContainer) conteudoContainer.innerHTML = conteudoHTML;

    // --- 7. INJETAR INFO DO PERFIL (RODAPÉ DA SIDEBAR) ---
    if (nomeUtilizadorEl && perfil) {
        nomeUtilizadorEl.textContent = nomeBase;
        perfilUtilizadorEl.textContent = perfil.charAt(0).toUpperCase() + perfil.slice(1);
    }
    
    // --- 9. LÓGICA DO TOGGLE DA BARRA LATERAL (USA LOCALSTORAGE - MANTIDA) ---
    const toggleBtn = document.getElementById('toggle-sidebar');
    const container = document.getElementById('dashboard-container');
    
    if (toggleBtn && container) {
        // Manter a chave de preferência da sidebar no localStorage
        const isRecolhida = localStorage.getItem('sidebarRecolhida') === 'true'; 
        if (isRecolhida) {
            container.classList.add('sidebar-recolhida');
            toggleBtn.textContent = '→';
        } else {
            toggleBtn.textContent = '←';
        }

        toggleBtn.addEventListener('click', () => {
            container.classList.toggle('sidebar-recolhida');
            const novoEstado = container.classList.contains('sidebar-recolhida');
            // Manter a chave de preferência da sidebar no localStorage
            localStorage.setItem('sidebarRecolhida', novoEstado); 
            toggleBtn.textContent = novoEstado ? '→' : '←';
        });
    }
}


// =========================================================
// SCRIPT PRINCIPAL DO DASHBOARD (MIGRADO PARA FIREBASE)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {

    // NOVO: Listener de estado de autenticação do Firebase
  
    // --- 8. LÓGICA DE LOGOUT (AGORA FIREBASE) ---
    const btnLogout = document.getElementById('btn-logout'); 
    
    let firebaseCarregado = false;

auth.onAuthStateChanged(async (user) => {

    if (!user) {
        // Utilizador não autenticado
        alert("Acesso negado. Por favor, faça login.");
        window.location.href = "./login.html";
        return;
    }

    try {
        const uid = user.uid;
        const doc = await db.collection("utilizadores").doc(uid).get();

        if (!doc.exists) {
            console.error("Perfil não encontrado no Firestore.");
            await auth.signOut();
            window.location.href = "./login.html";
            return;
        }

        const perfil = doc.data().perfil;
        const emailCompleto = user.email;

        carregarConteudoDashboard(perfil, emailCompleto);

        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            //await auth.signOut();
        // window.location.href = "./login.html";
        }
});


    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault(); 
            
            try {
                // 1. Fazer logout do Firebase
                await auth.signOut();
                
                // 2. Limpar apenas a chave de preferência da sidebar (única chave de localStorage mantida)
                localStorage.removeItem('sidebarRecolhida');
                
                // 3. Redirecionar
                window.location.href = './login.html';
            } catch (error) {
                console.error("Erro ao fazer logout Firebase:", error);
            }
        });
    }
    
    // NOTA: A lógica do toggle da sidebar (Passo 9) foi movida para a função carregarConteudoDashboard
    // para garantir que os elementos do DOM estão prontos, mas ainda usa localStorage.
});