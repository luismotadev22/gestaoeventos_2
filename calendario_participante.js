import { db, auth } from "./firebase_connection.js";

// Firebase v8 global (se precisares no futuro)
const firebase = window.firebase;

const nomeEl = document.getElementById("display-nome-utilizador");
const btnLogout = document.getElementById("btn-logout");
const debugErro = document.getElementById("debug-erro");

const toggleBtn = document.getElementById("toggle-sidebar");
const container = document.getElementById("dashboard-container");

const pesquisaEl = document.getElementById("pesquisa-cal");

const btnHoje = document.getElementById("btn-hoje");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const mesAnoEl = document.getElementById("cal-mes-ano");

const gridEl = document.getElementById("cal-grid");
const diaTituloEl = document.getElementById("dia-titulo");
const diaSubEl = document.getElementById("dia-sub");
const diaBadgeEl = document.getElementById("dia-badge");
const listaDiaEl = document.getElementById("lista-dia");

// Modal
const meBackdrop = document.getElementById("modal-evento-backdrop");
const meFechar = document.getElementById("me-fechar");
const meFechar2 = document.getElementById("me-fechar-2");
const meIrExplorar = document.getElementById("me-ir-explorar");
const meVerBilhete = document.getElementById("me-ver-bilhete");

function showErro(msg) {
  console.error(msg);
  if (debugErro) {
    debugErro.style.display = "block";
    debugErro.textContent = msg;
  }
}

function aplicarSidebarToggle() {
  if (!toggleBtn || !container) return;
  const isRecolhida = localStorage.getItem("sidebarRecolhida") === "true";
  if (isRecolhida) {
    container.classList.add("sidebar-recolhida");
    toggleBtn.textContent = "→";
  } else toggleBtn.textContent = "←";

  toggleBtn.addEventListener("click", () => {
    container.classList.toggle("sidebar-recolhida");
    const novoEstado = container.classList.contains("sidebar-recolhida");
    localStorage.setItem("sidebarRecolhida", novoEstado);
    toggleBtn.textContent = novoEstado ? "→" : "←";
  });
}

function euro(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// aceita "YYYY-MM-DD" ou "DD/MM/YYYY"
function parseDataString(s) {
  if (!s || typeof s !== "string") return null;

  // ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]), m = Number(iso[2]) - 1, d = Number(iso[3]);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  // PT
  const pt = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (pt) {
    const d = Number(pt[1]), m = Number(pt[2]) - 1, y = Number(pt[3]);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  // fallback Date()
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

  return null;
}

function formatDiaTitulo(d) {
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${dias[d.getDay()]}, ${pad2(d.getDate())} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatMesAno(d) {
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/* =========================
   DADOS
========================= */
let currentUser = null;
let eventos = [];              // todos eventos ativos
let eventsByDate = new Map();  // dateKey -> array de eventos
let inscritoSet = new Set();   // ids dos eventos inscritos
let selectedDate = new Date(); // dia selecionado
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function aplicarIndexEventos() {
  eventsByDate = new Map();
  eventos.forEach(ev => {
    if (!ev.__dateKey) return;
    if (!eventsByDate.has(ev.__dateKey)) eventsByDate.set(ev.__dateKey, []);
    eventsByDate.get(ev.__dateKey).push(ev);
  });

  // ordenar eventos do mesmo dia por hora (se existir)
  eventsByDate.forEach(arr => {
    arr.sort((a, b) => (a.hora_string || "").localeCompare(b.hora_string || ""));
  });
}

/* =========================
   FIRESTORE LOADS
========================= */
async function carregarEventosAtivos() {
  const snap = await db.collection("eventos").where("estado", "==", "ativo").get();

  const arr = [];
  snap.forEach(doc => {
    const data = doc.data() || {};
    const dt = parseDataString(data.data_string);
    const dk = dt ? dateKey(dt) : null;

    arr.push({
      id: doc.id,
      ...data,
      __dateObj: dt,
      __dateKey: dk,
    });
  });

  // manter só com data válida
  eventos = arr.filter(e => e.__dateKey);

  // ordenar por data
  eventos.sort((a,b) => {
    const ta = a.__dateObj ? a.__dateObj.getTime() : 0;
    const tb = b.__dateObj ? b.__dateObj.getTime() : 0;
    return ta - tb;
  });

  aplicarIndexEventos();
}

async function carregarInscricoesUser(uid) {
  inscritoSet = new Set();
  const snap = await db.collection("inscricoes").where("uid_user", "==", uid).get();
  snap.forEach(doc => {
    const d = doc.data();
    if (d?.uid_evento) inscritoSet.add(d.uid_evento);
  });
}

/* =========================
   RENDER CALENDÁRIO
========================= */
function getFiltroTermo() {
  return (pesquisaEl.value || "").toLowerCase().trim();
}

function eventoMatchPesquisa(ev, termo) {
  if (!termo) return true;
  const txt = `${ev.nome || ""} ${ev.local || ""}`.toLowerCase();
  return txt.includes(termo);
}

function renderGrid() {
  const termo = getFiltroTermo();
  mesAnoEl.textContent = formatMesAno(viewMonth);

  gridEl.innerHTML = "";

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // queremos semana começar em Segunda
  const firstDay = first.getDay(); // 0=Dom
  const offset = (firstDay === 0) ? 6 : (firstDay - 1);

  const start = new Date(year, month, 1 - offset);

  // 6 semanas x 7 dias = 42
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dk = dateKey(d);

    const cell = document.createElement("div");
    cell.className = "day-cell";

    const out = d.getMonth() !== month;
    if (out) cell.classList.add("day-out");
    if (dk === dateKey(selectedDate)) cell.classList.add("day-selected");

    // tem eventos neste dia? (aplicar filtro)
    const eventosDiaTotal = eventsByDate.get(dk) || [];
    const eventosDia = eventosDiaTotal.filter(ev => eventoMatchPesquisa(ev, termo));

    if (eventosDia.length) {
      cell.classList.add("day-has-event");
      const temInscrito = eventosDia.some(ev => inscritoSet.has(ev.id));
      cell.classList.add(temInscrito ? "day-event-inscrito" : "day-event-nao");
    }

    cell.dataset.date = dk;
    cell.innerHTML = `<div class="day-num">${d.getDate()}</div>`;

    cell.addEventListener("click", () => {
      selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      renderGrid();
      renderDia();
    });

    gridEl.appendChild(cell);
  }

  // se o mês não tiver o dia selecionado, ajustar painel
  const selMonth = selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  if (!selMonth) {
    // não muda selectedDate automaticamente; só mantém, mas painel atualiza ao clicar
  }
}

function renderDia() {
  const termo = getFiltroTermo();
  const dk = dateKey(selectedDate);

  diaTituloEl.textContent = formatDiaTitulo(selectedDate);
  diaBadgeEl.textContent = dk;
  diaSubEl.textContent = "Eventos deste dia";

  const eventosDiaTotal = eventsByDate.get(dk) || [];
  const eventosDia = eventosDiaTotal.filter(ev => eventoMatchPesquisa(ev, termo));

  if (!eventosDia.length) {
    listaDiaEl.innerHTML = `<div class="empty-day">Sem eventos para este dia.</div>`;
    return;
  }

  listaDiaEl.innerHTML = eventosDia.map(ev => {
    const estaInscrito = inscritoSet.has(ev.id);

    return `
      <div class="ev-row">
        <div class="ev-left">
          <p class="ev-title">${ev.nome || "Evento"}</p>
          <div class="ev-meta">
            <span><i class="fas fa-clock"></i> ${ev.hora_string || "—"}</span>
            <span><i class="fas fa-map-marker-alt"></i> ${ev.local || "—"}</span>
          </div>
        </div>

        <div class="ev-right">
          <span class="${estaInscrito ? "badge-inscrito" : "badge-nao"}">
            ${estaInscrito ? "Inscrito" : "Disponível"}
          </span>

          <button class="btn-ver" data-id="${ev.id}">Ver</button>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   MODAL
========================= */
function abrirModalEvento(ev) {
  const estaInscrito = inscritoSet.has(ev.id);

  document.getElementById("me-titulo").textContent = ev.nome || "Evento";
  document.getElementById("me-sub").textContent = `${ev.local || "—"}`;

  document.getElementById("me-data").textContent =
    `${ev.data_string || "—"}${ev.hora_string ? " · " + ev.hora_string : ""}`;

  document.getElementById("me-local").textContent = ev.local || "—";

  const normal = ev?.precos?.normal;
  const vip = ev?.precos?.vip;

  document.getElementById("me-precos").textContent =
    `Normal: ${normal == null ? "—" : euro(normal)} | VIP: ${vip == null ? "—" : euro(vip)}`;

  const status = document.getElementById("me-status");
  status.className = "me-status " + (estaInscrito ? "inscrito" : "nao");
  status.textContent = estaInscrito ? "✅ Já estás inscrito neste evento." : "ℹ️ Ainda não estás inscrito.";

  // Botões
  if (estaInscrito) {
    meVerBilhete.style.display = "inline-flex";
    meIrExplorar.style.display = "none";
  } else {
    meVerBilhete.style.display = "none";
    meIrExplorar.style.display = "inline-flex";
  }

  meBackdrop.style.display = "flex";
}

function fecharModalEvento() {
  meBackdrop.style.display = "none";
}

meFechar.addEventListener("click", fecharModalEvento);
meFechar2.addEventListener("click", fecharModalEvento);
meBackdrop.addEventListener("click", (e) => { if (e.target === meBackdrop) fecharModalEvento(); });

meIrExplorar.addEventListener("click", () => {
  window.location.href = "explorar_eventos.html";
});

meVerBilhete.addEventListener("click", () => {
  window.location.href = "minhas_inscricoes.html";
});

/* =========================
   LISTENERS
========================= */
listaDiaEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-ver");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  const ev = eventos.find(x => x.id === id);
  if (!ev) return;

  abrirModalEvento(ev);
});

btnHoje.addEventListener("click", () => {
  const now = new Date();
  selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  renderGrid();
  renderDia();
});

btnPrev.addEventListener("click", () => {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  renderGrid();
});

btnNext.addEventListener("click", () => {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  renderGrid();
});

pesquisaEl.addEventListener("input", () => {
  renderGrid();
  renderDia();
});

// Logout
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

/* =========================
   INIT
========================= */
aplicarSidebarToggle();

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  currentUser = user;
  nomeEl.textContent = (user.email || "Utilizador").split("@")[0];

  try {
    await carregarInscricoesUser(user.uid);
    await carregarEventosAtivos();

    // default: abrir no mês do primeiro evento futuro (se existir)
    const hojeKey = dateKey(new Date());
    const prox = eventos.find(e => e.__dateKey >= hojeKey) || eventos[0];
    if (prox?.__dateObj) {
      viewMonth = new Date(prox.__dateObj.getFullYear(), prox.__dateObj.getMonth(), 1);
      selectedDate = new Date(prox.__dateObj.getFullYear(), prox.__dateObj.getMonth(), prox.__dateObj.getDate());
    }

    renderGrid();
    renderDia();
  } catch (err) {
    showErro("Erro a carregar calendário: " + (err?.message || String(err)));
  }
});