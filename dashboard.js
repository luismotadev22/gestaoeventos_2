import { auth, db } from './firebase_connection.js';

/* ===============================
   HELPERS
================================ */
function euro(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function parseDataHora(dataStr, horaStr) {
  if (!dataStr) return null;
  const h = horaStr || "00:00";
  const d = new Date(`${dataStr}T${h}`);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDataPT(dateStr) {
  // espera "YYYY-MM-DD"
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
   PARTICIPANTE: DADOS REAIS
   (coleção: inscricoes)
================================ */
async function obterDadosParticipante(uid) {
  const snap = await db.collection("inscricoes").where("uid_user", "==", uid).get();

  const inscricoes = [];
  snap.forEach((doc) => inscricoes.push({ id: doc.id, ...doc.data() }));

  const total = inscricoes.length;
  const vip = inscricoes.filter(i => (i.tipo_bilhete || "").toLowerCase() === "vip").length;
  const normal = inscricoes.filter(i => (i.tipo_bilhete || "").toLowerCase() !== "vip").length;

  const gastoTotal = inscricoes.reduce((acc, i) => acc + Number(i.valor_pago ?? 0), 0);

  // Próximo evento futuro: data/hora mais próxima (>= agora)
  const agora = new Date();
  const futuras = inscricoes
    .map(i => ({ ...i, __dt: parseDataHora(i.evento_data_string, i.evento_hora_string) }))
    .filter(i => i.__dt && i.__dt.getTime() >= agora.getTime())
    .sort((a, b) => a.__dt - b.__dt);

  let proximoEvento = null;

  if (futuras.length > 0) {
    const p = futuras[0];
    proximoEvento = {
      uid_evento: p.uid_evento || "",           // ✅ necessário para abrir bilhete direto
      nome: p.evento_nome || "Evento",
      data: p.evento_data_string || "",
      hora: p.evento_hora_string || "",
      local: p.evento_local || "—",
      tipo_bilhete: p.tipo_bilhete || "normal"
    };
  } else if (inscricoes.length > 0) {
    // fallback: mostra o mais “perto” (mesmo que já tenha passado) para não ficar vazio
    const ordenadas = inscricoes
      .map(i => ({ ...i, __dt: parseDataHora(i.evento_data_string, i.evento_hora_string) }))
      .filter(i => i.__dt)
      .sort((a, b) => a.__dt - b.__dt);

    if (ordenadas.length > 0) {
      const p = ordenadas[0];
      proximoEvento = {
        uid_evento: p.uid_evento || "",
        nome: p.evento_nome || "Evento",
        data: p.evento_data_string || "",
        hora: p.evento_hora_string || "",
        local: p.evento_local || "—",
        tipo_bilhete: p.tipo_bilhete || "normal"
      };
    }
  }

  return {
    proximoEvento,
    bilhetes: { total, vip, normal, gastoTotal },
    notificacoes: 5 // manténs como estático
  };
}

/* ===============================
   ORGANIZADOR (mantém simples)
================================ */


/* ===============================
   RENDERIZAÇÃO DO CONTEÚDO
================================ */
function carregarConteudoDashboard(perfil, emailCompleto, dados) {
    const nomeBase = emailCompleto.split('@')[0];
    const menuContainer = document.getElementById('menu-principal-dinamico');
    const conteudoContainer = document.getElementById('conteudo-principal-dinamico');
    const nomeUtilizadorEl = document.getElementById('display-nome-utilizador');
    const perfilUtilizadorEl = document.getElementById('display-perfil-utilizador');
    const tituloHeaderEl = document.getElementById('display-header-titulo');
    const subtituloHeaderEl = document.getElementById('display-header-subtitulo');

    let menuHTML = '';
    let conteudoHTML = '';

    if (perfil === 'organizador') {
        tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
        subtituloHeaderEl.textContent = 'Crie os melhores eventos, workshops e conferências do IPCA!';

        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>
            <a href="criar_evento.html" class="menu-item"><i class="fas fa-plus-circle"></i><span>Criar Evento</span></a>
            <a href="editar_eventos.html" class="menu-item"><i class="fas fa-edit"></i><span>Editar Evento</span></a>
            <a href="vendas.html" class="menu-item"><i class="fas fa-chart-line"></i><span>Gestão de Vendas</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        conteudoHTML = `
            <div class="widget">
                <h3>Total Arrecadado (€)</h3>
                <p class="widget-numero widget-dinheiro">${euro(dados.totalArrecadado)}</p>
                <p class="widget-detalhe">Receita bruta baseada em inscrições reais.</p>
            </div>
            <div class="widget">
                <h3>Inscrições Totais</h3>
                <p class="widget-numero">${dados.inscricoesTotais}</p>
                <p class="widget-detalhe">Total de participantes em todos os eventos.</p>
            </div>
            <div class="widget">
                <h3>Eventos Ativos</h3>
                <p class="widget-numero">${dados.eventosAtivos}</p>
                <p class="widget-detalhe">Eventos atualmente ativos no sistema.</p>
            </div>
            <div class="widget">
                <h3>Notificações</h3>
                <p class="widget-numero">${dados.notificacoes}</p>
                <p class="widget-detalhe">Alertas e pendências não lidas.</p>
            </div>
            <div class="widget widget-cta">
                <h3>Pronto para o próximo evento?</h3>
                <p class="widget-detalhe">Comece a criar o seu próximo evento.</p>
                <a href="criar_evento.html" class="btn btn-primario"><i class="fas fa-plus-circle"></i> Criar Novo Evento</a>
            </div>
        `;
    } 
    else if (perfil === 'participante') {
        tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
        subtituloHeaderEl.textContent = 'Participe nos melhores eventos e workshops do IPCA!';

        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>
            <a href="explorar_eventos.html" class="menu-item"><i class="fas fa-search"></i><span>Explorar Eventos</span></a>
            <a href="calendario_participante.html" class="menu-item"><i class="fas fa-calendar-alt"></i><span>Calendário</span></a>
            <a href="minhas_inscricoes.html" class="menu-item"><i class="fas fa-ticket-alt"></i><span>As Minhas Inscrições</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        const prox = dados.proximoEvento;
        const infoEventoHTML = prox ? `
            <p class="widget-titulo-destaque">${prox.nome}</p>
            <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> Data: ${formatDataPT(prox.data)} às ${prox.hora}</p>
            <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> Local: ${prox.local}</p>
            <p class="widget-detalhe"><i class="fas fa-tag"></i> Tipo: ${capitalizar(prox.tipo_bilhete)}</p>
        ` : `<p class="widget-detalhe">Não tens eventos agendados.</p>`;

        conteudoHTML = `
            <div class="widget">
                <h3>Próximo Evento</h3>
                ${infoEventoHTML}
            </div>
            <div class="widget">
                <h3>Os Meus Bilhetes</h3>
                <p class="widget-numero">${dados.bilhetes.total}</p>
                <p class="widget-detalhe">VIP: ${dados.bilhetes.vip} | Normal: ${dados.bilhetes.normal}</p>
            </div>
            <div class="widget">
                <h3>Gasto Total</h3>
                <p class="widget-numero widget-dinheiro">${euro(dados.bilhetes.gastoTotal)}</p>
                <p class="widget-detalhe">Total gasto em inscrições.</p>
            </div>
            <div class="widget">
                <h3>Notificações</h3>
                <p class="widget-numero">${dados.notificacoes}</p>
                <p class="widget-detalhe">Alertas e lembretes novos.</p>
            </div>
             <div class="widget widget-cta">
                <h3>Explorar novas experiências?</h3>
                <p class="widget-detalhe">Encontre novos workshops e palestras.</p>
                <a href="explorar_eventos.html" class="btn btn-primario"><i class="fas fa-search"></i> Explorar Eventos</a>
            </div>

            <div class="widget-actions">
                <a href="minhas_inscricoes.html?evento=${encodeURIComponent(prox.uid_evento || "")}"
                   class="btn btn-primario">
                  <i class="fas fa-ticket-alt"></i> Abrir bilhete
                </a>
              </div>
        `;
    }

    if (menuContainer) menuContainer.innerHTML = menuHTML;
    if (conteudoContainer) conteudoContainer.innerHTML = conteudoHTML;
    if (nomeUtilizadorEl) nomeUtilizadorEl.textContent = nomeBase;
    if (perfilUtilizadorEl) perfilUtilizadorEl.textContent = perfil.charAt(0).toUpperCase() + perfil.slice(1);
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

            const perfil = doc.data().perfil;
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