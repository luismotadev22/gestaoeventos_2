import { auth, db } from './firebase_connection.js';

/* ===============================
   HELPERS / UTILITÁRIOS
================================ */
function euro(n) {
    const v = Number(n ?? 0);
    return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function parseDataHora(dataStr, horaStr) {
    if (!dataStr) return null;
    const h = horaStr || "00:00";
    const d = new Date(`${dataStr}T${h}`);
    return isNaN(d.getTime()) ? null : d;
}

function formatDataPT(dateStr) {
    if (!dateStr) return "—";
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return String(dateStr);
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function capitalizar(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ===============================
   DADOS REAIS: ORGANIZADOR
================================ */
async function obterDadosReaisOrganizador(organizadorUid) {
    try {
        const eventosSnapshot = await db.collection("eventos")
            .where("responsavel_uid", "==", organizadorUid)
            .get();

        if (eventosSnapshot.empty) {
            return { totalArrecadado: 0, inscricoesTotais: 0, eventosAtivos: 0, notificacoes: 0 };
        }

        let totalGeralFaturado = 0;
        let totalGeralInscritos = 0;
        let eventosAtivosContagem = 0;

        for (const docEvento of eventosSnapshot.docs) {
            const evento = docEvento.data();
            const eventoId = docEvento.id;

            if (evento.estado === "ativo") eventosAtivosContagem++;

            const vendasSnapshot = await db.collection("inscricoes")
                .where("uid_evento", "==", eventoId)
                .get();

            totalGeralInscritos += vendasSnapshot.size;

            vendasSnapshot.forEach(docInscricao => {
                const inscricao = docInscricao.data();
                // Tenta somar valor_pago ou preco
                totalGeralFaturado += (Number(inscricao.valor_pago) || Number(inscricao.preco) || 0);
            });
        }

        return {
            totalArrecadado: totalGeralFaturado,
            inscricoesTotais: totalGeralInscritos,
            eventosAtivos: eventosAtivosContagem,
            notificacoes: 2 
        };
    } catch (error) {
        console.error("Erro ao sincronizar dados de organizador:", error);
        return { totalArrecadado: 0, inscricoesTotais: 0, eventosAtivos: 0, notificacoes: 0 };
    }
}

/* ===============================
   DADOS REAIS: PARTICIPANTE
================================ */
async function obterDadosParticipante(uid) {
    try {
        const snap = await db.collection("inscricoes").where("uid_user", "==", uid).get();
        const inscricoes = [];
        snap.forEach((doc) => inscricoes.push({ id: doc.id, ...doc.data() }));

        const total = inscricoes.length;
        const vip = inscricoes.filter(i => (i.tipo_bilhete || "").toLowerCase() === "vip").length;
        const normal = total - vip;
        const gastoTotal = inscricoes.reduce((acc, i) => acc + Number(i.valor_pago ?? 0), 0);

        const agora = new Date();
        const ordenadas = inscricoes
            .map(i => ({ ...i, __dt: parseDataHora(i.evento_data_string, i.evento_hora_string) }))
            .filter(i => i.__dt !== null)
            .sort((a, b) => a.__dt - b.__dt);

        const futuras = ordenadas.filter(i => i.__dt.getTime() >= agora.getTime());
        const eventoDestaque = futuras.length > 0 ? futuras[0] : (ordenadas.length > 0 ? ordenadas[ordenadas.length - 1] : null);

        let proximoEvento = null;
        if (eventoDestaque) {
            proximoEvento = {
                uid_evento: eventoDestaque.uid_evento || "",
                nome: eventoDestaque.evento_nome || "Evento",
                data: eventoDestaque.evento_data_string || "",
                hora: eventoDestaque.evento_hora_string || "",
                local: eventoDestaque.evento_local || "—",
                tipo_bilhete: eventoDestaque.tipo_bilhete || "normal"
            };
        }

        return {
            proximoEvento,
            bilhetes: { total, vip, normal, gastoTotal },
            notificacoes: 5 
        };
    } catch (error) {
        console.error("Erro ao obter dados do participante:", error);
        return null;
    }
}

/* ===============================
   RENDERIZAÇÃO DO CONTEÚDO
================================ */
function carregarConteudoDashboard(perfil, emailCompleto, dados) {
    const nomeBase = (emailCompleto || "Utilizador").split('@')[0];
    const menuContainer = document.getElementById('menu-principal-dinamico');
    const conteudoContainer = document.getElementById('conteudo-principal-dinamico');
    const nomeUtilizadorEl = document.getElementById('display-nome-utilizador');
    const perfilUtilizadorEl = document.getElementById('display-perfil-utilizador');
    const tituloHeaderEl = document.getElementById('display-header-titulo');
    const subtituloHeaderEl = document.getElementById('display-header-subtitulo');

    let menuHTML = '';
    let conteudoHTML = '';

    if (perfil === 'organizador') {
        tituloHeaderEl.textContent = `Bem-vindo, ${capitalizar(nomeBase)}!`;
        subtituloHeaderEl.textContent = `Cria e gere os seus eventos no IPCA.`;

        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>
            <a href="criar_evento.html" class="menu-item"><i class="fas fa-plus-circle"></i><span>Criar Evento</span></a>
            <a href="editar_eventos.html" class="menu-item"><i class="fas fa-edit"></i><span>Editar Evento</span></a>
            <a href="vendas.html" class="menu-item"><i class="fas fa-chart-line"></i><span>Gestão de Vendas</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        conteudoHTML = `
            <div class="widget">
                <h3>Total Arrecadado</h3>
                <p class="widget-numero widget-dinheiro">${euro(dados.totalArrecadado)}</p>
                <p class="widget-detalhe">Receita bruta das inscrições.</p>
                <div class="widget-actions">
                    <a href="vendas.html" class="btn btn-primario"><i class="fas fa-file-invoice-dollar"></i> Ver Detalhes</a>
                </div>
            </div>
            <div class="widget">
                <h3>Inscrições Totais</h3>
                <p class="widget-numero">${dados.inscricoesTotais}</p>
                <p class="widget-detalhe">Participantes registados.</p>
                <div class="widget-actions">
                 
                </div>
            </div>
            <div class="widget">
                <h3>Eventos Ativos</h3>
                <p class="widget-numero">${dados.eventosAtivos}</p>
                <p class="widget-detalhe">A decorrer ou publicados.</p>
                <div class="widget-actions">
                    <a href="editar_eventos.html" class="btn btn-primario"><i class="fas fa-calendar-check"></i> Gerir Eventos</a>
                </div>
            </div>
            <div class="widget widget-cta">
                <h3>Novo Evento?</h3>
                <p class="widget-detalhe">Comece agora a criar o seu próximo evento IPCA.</p>
                <div class="widget-actions">
                    <a href="criar_evento.html" class="btn btn-primario"><i class="fas fa-plus"></i> Criar Novo</a>
                </div>
            </div>
        `;
    } 
    else {
        tituloHeaderEl.textContent = `Bem-vindo, ${capitalizar(nomeBase)}!`;
        subtituloHeaderEl.textContent = 'Encontra e participa nos melhores eventos do IPCA.';

        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>
            <a href="explorar_eventos.html" class="menu-item"><i class="fas fa-search"></i><span>Explorar Eventos</span></a>
             <a href="calendario_participante.html" class="menu-item"><i class="fas fa-calendar-alt"></i><span>Calendário</span></a>
            <a href="minhas_inscricoes.html" class="menu-item"><i class="fas fa-ticket-alt"></i><span>As Minhas Inscrições</span></a>
            <a href="eventos_favoritos.html" class="menu-item"><i class="fas fa-star"></i><span>Eventos Favoritos</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        const prox = dados.proximoEvento;
        const infoEventoHTML = prox ? `
            <p class="widget-titulo-destaque">${prox.nome}</p>
            <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> ${formatDataPT(prox.data)} às ${prox.hora}</p>
            <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> ${prox.local}</p>
        ` : `<p class="widget-detalhe">Não tens eventos agendados.</p>`;

        conteudoHTML = `
            <div class="widget">
                <h3>Próximo Evento</h3>
                ${infoEventoHTML}
                <div class="widget-actions">
                    ${prox ? `<a href="minhas_inscricoes.html?evento=${prox.uid_evento}" class="btn btn-primario"><i class="fas fa-ticket-alt"></i> Abrir Bilhete</a>` : 
                    `<a href="explorar_eventos.html" class="btn btn-primario">Explorar</a>`}
                </div>
            </div>
            <div class="widget">
                <h3>Os Meus Bilhetes</h3>
                <p class="widget-numero">${dados.bilhetes.total}</p>
                <p class="widget-detalhe">VIP: ${dados.bilhetes.vip} | Normal: ${dados.bilhetes.normal}</p>
                <div class="widget-actions">
                    <a href="minhas_inscricoes.html" class="btn btn-primario"><i class="fas fa-list-ul"></i> Ver Todos</a>
                </div>
            </div>
            <div class="widget">
                <h3>Gasto Total</h3>
                <p class="widget-numero widget-dinheiro">${euro(dados.bilhetes.gastoTotal)}</p>
                <p class="widget-detalhe">Total investido em experiências.</p>
                <div class="widget-actions">
                  
                </div>
            </div>
            <div class="widget widget-cta">
                <h3>Explorar Eventos?</h3>
                <p class="widget-detalhe">Encontra workshops e palestras incríveis.</p>
                <div class="widget-actions">
                    <a href="explorar_eventos.html" class="btn btn-primario"><i class="fas fa-search"></i> Explorar</a>
                </div>
            </div>
        `;
    }

    if (menuContainer) menuContainer.innerHTML = menuHTML;
    if (conteudoContainer) conteudoContainer.innerHTML = conteudoHTML;
    if (nomeUtilizadorEl) nomeUtilizadorEl.textContent = nomeBase;
    if (perfilUtilizadorEl) perfilUtilizadorEl.textContent = capitalizar(perfil);
}

/* ===============================
   INICIALIZAÇÃO / AUTH LISTENER
================================ */
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "./login.html";
            return;
        }

        try {
            const doc = await db.collection("utilizadores").doc(user.uid).get();
            if (!doc.exists) {
                await auth.signOut();
                window.location.href = "./login.html";
                return;
            }

            const perfil = doc.data().perfil || 'participante';
            let dados;

            if (perfil === 'organizador') {
                dados = await obterDadosReaisOrganizador(user.uid);
            } else {
                dados = await obterDadosParticipante(user.uid);
            }

            carregarConteudoDashboard(perfil, user.email, dados);

        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
        }
    });

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await auth.signOut();
            window.location.href = './login.html';
        });
    }
});