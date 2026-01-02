import { db, auth } from "./firebase_connection.js";

// Firebase v8 global (FieldValue)
const firebase = window.firebase;

const listaEl = document.getElementById("lista-eventos");
const pesquisaEl = document.getElementById("pesquisa");
// ✅ REMOVIDO: const tipoEl = document.getElementById("tipo");
const nomeEl = document.getElementById("display-nome-utilizador");
const btnLogout = document.getElementById("btn-logout");
const debugErro = document.getElementById("debug-erro");

// sidebar toggle
const toggleBtn = document.getElementById("toggle-sidebar");
const container = document.getElementById("dashboard-container");

function showErro(msg) {
  console.error(msg);
  if (debugErro) {
    debugErro.style.display = "block";
    debugErro.textContent = msg;
  }
}

function euro(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
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

let eventos = [];
let favoritosSet = new Set();
let inscritoSet = new Set();
let currentUser = null;

/* =========================
   MODAL SUCESSO (centro)
========================= */
function garantirModalSucesso() {
  if (document.getElementById("modal-sucesso-backdrop")) return;

  const html = `
  <div id="modal-sucesso-backdrop" style="
    position:fixed; inset:0; background:rgba(0,0,0,.55);
    display:none; align-items:center; justify-content:center; z-index:99999; padding:16px;">
    <div style="width:100%; max-width:520px; background:#fff; border-radius:16px; overflow:hidden;
      box-shadow:0 18px 60px rgba(0,0,0,.25);">
      <div style="padding:16px 18px; border-bottom:1px solid rgba(0,0,0,.08); display:flex; align-items:center; gap:12px;">
        <div style="width:42px; height:42px; border-radius:12px; background:rgba(25,135,84,.15); display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-check" style="color:#146c43; font-size:18px;"></i>
        </div>
        <div style="flex:1;">
          <h3 style="margin:0; font-size:18px; font-weight:900;">Inscrição concluída!</h3>
          <div id="modal-sucesso-sub" style="margin-top:4px; font-size:13px; color:rgba(0,0,0,.65);"></div>
        </div>
        <button id="modal-sucesso-fechar-x" type="button" style="border:0; background:rgba(0,0,0,.08); border-radius:10px; padding:8px 10px; cursor:pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div style="padding:16px 18px;">
        <div style="font-size:14px; color:rgba(0,0,0,.75); line-height:1.4;">
          O teu bilhete já está disponível em <b>As Minhas Inscrições</b>.
        </div>

        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
          <button id="modal-sucesso-ver" type="button" style="
            flex:1; min-width:180px; border:0; background:#0b5ed7; color:#fff;
            border-radius:12px; padding:10px 12px; font-weight:900; cursor:pointer;">
            <i class="fas fa-ticket-alt"></i> Ver bilhete
          </button>

          <button id="modal-sucesso-fechar" type="button" style="
            flex:1; min-width:180px; border:0; background:rgba(0,0,0,.08);
            border-radius:12px; padding:10px 12px; font-weight:900; cursor:pointer;">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const backdrop = document.getElementById("modal-sucesso-backdrop");
  const fechar = document.getElementById("modal-sucesso-fechar");
  const fecharX = document.getElementById("modal-sucesso-fechar-x");

  function close() {
    backdrop.style.display = "none";
  }

  fechar.addEventListener("click", close);
  fecharX.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

  document.getElementById("modal-sucesso-ver").addEventListener("click", () => {
    window.location.href = "./minhas_inscricoes.html";
  });
}

function mostrarSucessoInscricao(eventoNome = "") {
  garantirModalSucesso();
  document.getElementById("modal-sucesso-sub").textContent = eventoNome ? `Bilhete criado para: ${eventoNome}` : "";
  document.getElementById("modal-sucesso-backdrop").style.display = "flex";
}

/* =========================
   MODAL INSCRIÇÃO
========================= */
function garantirModalInscricao() {
  if (document.getElementById("modal-inscricao-backdrop")) return;

  const html = `
  <div id="modal-inscricao-backdrop" style="
    position:fixed; inset:0; background:rgba(0,0,0,.55);
    display:none; align-items:center; justify-content:center; z-index:9999; padding:16px;">
    <div style="width:100%; max-width:520px; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 18px 60px rgba(0,0,0,.25);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid rgba(0,0,0,.08);">
        <div>
          <h3 id="modal-inscricao-titulo" style="margin:0; font-size:18px;">Inscrição</h3>
          <div id="modal-inscricao-sub" style="font-size:12px; color:rgba(0,0,0,.65); margin-top:4px;"></div>
        </div>
        <button id="modal-inscricao-fechar" type="button" style="border:0; background:rgba(0,0,0,.08); border-radius:10px; padding:8px 10px; cursor:pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form id="form-inscricao" style="padding:16px; display:grid; gap:12px;">
        <input type="hidden" id="modal-evento-id" />

        <div>
          <label style="font-weight:700; font-size:13px;">Nome</label>
          <input id="modal-nome" type="text" required
            style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.15);" />
        </div>

        <div>
          <label style="font-weight:700; font-size:13px;">Email</label>
          <input id="modal-email" type="email" required
            style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.15);" />
        </div>

        <div>
          <label style="font-weight:700; font-size:13px;">Idade</label>
          <input id="modal-idade" type="number" min="1" max="120" required
            style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.15);" />
        </div>

        <div>
          <label style="font-weight:700; font-size:13px;">Tipo de bilhete</label>
          <select id="modal-tipo" required
            style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.15);">
            <option value="normal">Normal</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        <div id="modal-preco" style="font-size:12px; color:rgba(0,0,0,.65);"></div>

        <div style="display:flex; gap:10px; margin-top:4px;">
          <button type="button" id="modal-cancelar"
            style="flex:1; border:0; background:rgba(0,0,0,.08); border-radius:10px; padding:10px; font-weight:800; cursor:pointer;">
            Cancelar
          </button>
          <button type="submit" id="modal-confirmar"
            style="flex:1; border:0; background:#0b5ed7; color:#fff; border-radius:10px; padding:10px; font-weight:800; cursor:pointer;">
            Confirmar e pagar
          </button>
        </div>

        <div id="modal-status" style="display:none; font-size:13px; font-weight:700;"></div>
      </form>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const backdrop = document.getElementById("modal-inscricao-backdrop");
  const fechar = document.getElementById("modal-inscricao-fechar");
  const cancelar = document.getElementById("modal-cancelar");

  function close() {
    backdrop.style.display = "none";
    document.getElementById("form-inscricao").reset();
    const status = document.getElementById("modal-status");
    status.style.display = "none";
    status.textContent = "";
    const btn = document.getElementById("modal-confirmar");
    btn.disabled = false;
    btn.textContent = "Confirmar e pagar";
  }

  fechar.addEventListener("click", close);
  cancelar.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

  document.getElementById("modal-tipo").addEventListener("change", () => {
    const id = document.getElementById("modal-evento-id").value;
    const ev = eventos.find((x) => x.id === id);
    if (ev) atualizarPrecoNoModal(ev);
  });

  document.getElementById("form-inscricao").addEventListener("submit", async (e) => {
    e.preventDefault();
    await confirmarInscricao();
  });

  window.__closeInscricaoModal = close;
}

function openModalInscricao(ev) {
  garantirModalInscricao();

  const backdrop = document.getElementById("modal-inscricao-backdrop");
  document.getElementById("modal-inscricao-titulo").textContent = `Inscrição — ${ev.nome || "Evento"}`;
  document.getElementById("modal-inscricao-sub").textContent =
    `${ev.local || "—"} · ${ev.data_string || "—"}${ev.hora_string ? " · " + ev.hora_string : ""}`;

  document.getElementById("modal-evento-id").value = ev.id;
  document.getElementById("modal-nome").value = "";
  document.getElementById("modal-email").value = currentUser?.email || "";
  document.getElementById("modal-idade").value = "";
  document.getElementById("modal-tipo").value = "normal";

  atualizarPrecoNoModal(ev);

  backdrop.style.display = "flex";
}

function atualizarPrecoNoModal(ev) {
  const tipo = document.getElementById("modal-tipo").value;
  const normal = ev?.precos?.normal;
  const vip = ev?.precos?.vip;
  const p = tipo === "vip" ? vip : normal;

  document.getElementById("modal-preco").textContent =
    `Preço (${tipo.toUpperCase()}): ${p == null ? "—" : euro(p)}`;
}

/* =========================
   FAVORITOS + INSCRIÇÕES
========================= */
async function carregarFavoritos(uid) {
  favoritosSet = new Set();
  const snap = await db.collection("utilizadores").doc(uid).collection("favoritos").get();
  snap.forEach((d) => favoritosSet.add(d.id));
}

async function carregarInscricoes(uid) {
  inscritoSet = new Set();
  const snap = await db.collection("inscricoes").where("uid_user", "==", uid).get();
  snap.forEach((d) => {
    const data = d.data();
    if (data?.uid_evento) inscritoSet.add(data.uid_evento);
  });
}

async function toggleFavorito(eventoId) {
  const ref = db.collection("utilizadores").doc(currentUser.uid).collection("favoritos").doc(eventoId);

  if (favoritosSet.has(eventoId)) {
    await ref.delete();
    favoritosSet.delete(eventoId);
  } else {
    const ev = eventos.find((x) => x.id === eventoId);
    await ref.set({
      eventoId,
      nome: ev?.nome || "",
      local: ev?.local || "",
      tipo: (ev?.tipo || "academico"),
      data_string: ev?.data_string || "",
      hora_string: ev?.hora_string || "",
      precos: ev?.precos || {},
      guardadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    favoritosSet.add(eventoId);
  }

  render();
}

async function confirmarInscricao() {
  const eventoId = document.getElementById("modal-evento-id").value;
  const ev = eventos.find((x) => x.id === eventoId);
  if (!ev) return;

  if (inscritoSet.has(eventoId)) {
    window.__closeInscricaoModal?.();
    mostrarSucessoInscricao(ev.nome || "Evento");
    return;
  }

  const nome = document.getElementById("modal-nome").value.trim();
  const email = document.getElementById("modal-email").value.trim();
  const idade = Number(document.getElementById("modal-idade").value);
  const tipo = document.getElementById("modal-tipo").value;

  const btn = document.getElementById("modal-confirmar");
  const status = document.getElementById("modal-status");

  if (!nome || !email || !idade || idade < 1) {
    status.style.display = "block";
    status.style.color = "#8a0000";
    status.textContent = "Preenche todos os campos corretamente.";
    return;
  }

  const normal = ev?.precos?.normal;
  const vip = ev?.precos?.vip;
  const valor = tipo === "vip" ? Number(vip ?? 0) : Number(normal ?? 0);

  btn.disabled = true;
  btn.textContent = "A processar...";
  status.style.display = "block";
  status.style.color = "#333";
  status.textContent = "A processar pagamento (simulado)...";

  setTimeout(async () => {
    try {
      status.textContent = "Pagamento aprovado ✅ a gerar bilhete...";

      const dup = await db.collection("inscricoes")
        .where("uid_user", "==", currentUser.uid)
        .where("uid_evento", "==", eventoId)
        .limit(1)
        .get();

      if (!dup.empty) {
        inscritoSet.add(eventoId);
        render();
        window.__closeInscricaoModal?.();
        mostrarSucessoInscricao(ev.nome || "Evento");
        return;
      }

      const inscricaoId = `${currentUser.uid}_${eventoId}`;
      const ref = db.collection("inscricoes").doc(inscricaoId);

      const qrData = `IPCA|uid=${currentUser.uid}|evento=${eventoId}|tipo=${tipo}|ts=${Date.now()}`;

      await ref.set({
        uid_user: currentUser.uid,
        uid_evento: eventoId,

        evento_nome: ev.nome || "",
        evento_local: ev.local || "",
        evento_data_string: ev.data_string || "",
        evento_hora_string: ev.hora_string || "",
        evento_precos: ev.precos || {},

        nome,
        email,
        idade,
        tipo_bilhete: tipo,
        valor_pago: valor,

        estado_pagamento: "pago_simulado",
        qr_data: qrData,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });

      inscritoSet.add(eventoId);
      render();

      window.__closeInscricaoModal?.();
      mostrarSucessoInscricao(ev.nome || "Evento");
    } catch (err) {
      console.error(err);
      status.style.display = "block";
      status.style.color = "#8a0000";
      status.textContent = "Erro: " + (err?.message || String(err));
      btn.disabled = false;
      btn.textContent = "Confirmar e pagar";
    }
  }, 900);
}

/* =========================
   UI (cards)
========================= */
function cardEvento(e) {
  const normal = e?.precos?.normal;
  const vip = e?.precos?.vip;

  const inscritos = e.inscritos_atuais ?? 0;
  const max = e.max_participantes ?? "—";

  const isFav = favoritosSet.has(e.id);
  const jaInscrito = inscritoSet.has(e.id);

  return `
    <div class="evento-card">
      <div class="evento-head">
        <h3 class="evento-titulo">${e.nome || "Evento"}</h3>
        <span class="evento-tag">ACADÉMICO</span>
      </div>

      <div class="evento-info">
        <div><i class="fas fa-calendar-alt"></i> ${e.data_string || "—"}${e.hora_string ? " · " + e.hora_string : ""}</div>
        <div><i class="fas fa-map-marker-alt"></i> ${e.local || "—"}</div>
        <div><i class="fas fa-users"></i> ${inscritos} / ${max}</div>
        <div><i class="fas fa-euro-sign"></i> Normal: ${normal == null ? "—" : euro(normal)} | VIP: ${vip == null ? "—" : euro(vip)}</div>
      </div>

      <div class="evento-actions">
        ${
          jaInscrito
            ? `<div class="badge-inscrito"><i class="fas fa-check-circle"></i> Inscrito</div>`
            : `<button class="btn-primary btn-inscrever" data-id="${e.id}">
                 <i class="fas fa-ticket-alt"></i> Inscrever
               </button>`
        }

        <button class="btn-secondary btn-fav" data-id="${e.id}">
          <i class="fas fa-star"></i> ${isFav ? "Favorito" : "Adicionar aos favoritos"}
        </button>
      </div>
    </div>
  `;
}

function render() {
  const termo = (pesquisaEl.value || "").toLowerCase().trim();

  const filtrados = eventos.filter((e) => {
    const texto = `${e.nome || ""} ${e.local || ""}`.toLowerCase();
    return !termo || texto.includes(termo);
  });

  if (!filtrados.length) {
    listaEl.innerHTML = `<p class="widget-detalhe">Nenhum evento encontrado.</p>`;
    return;
  }

  listaEl.innerHTML = filtrados.map(cardEvento).join("");
}

/* =========================
   Carregar eventos
========================= */
async function carregarEventos() {
  try {
    listaEl.innerHTML = `<p class="widget-detalhe">A carregar eventos...</p>`;
    const snap = await db.collection("eventos").where("estado", "==", "ativo").get();

    eventos = [];
    snap.forEach((doc) => eventos.push({ id: doc.id, ...doc.data() }));

    render();
  } catch (err) {
    showErro("ERRO a carregar eventos: " + (err?.message || String(err)));
    listaEl.innerHTML = `<p class="widget-detalhe">Erro ao carregar eventos.</p>`;
  }
}

/* =========================
   Listeners
========================= */
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

aplicarSidebarToggle();
pesquisaEl.addEventListener("input", render);
// ✅ REMOVIDO: tipoEl.addEventListener("change", render);

listaEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  if (!id) return;

  if (btn.classList.contains("btn-inscrever")) {
    const ev = eventos.find((x) => x.id === id);
    if (ev) openModalInscricao(ev);
    return;
  }

  if (btn.classList.contains("btn-fav")) {
    btn.disabled = true;
    try {
      await toggleFavorito(id);
    } finally {
      btn.disabled = false;
    }
  }
});

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  currentUser = user;
  nomeEl.textContent = (user.email || "Utilizador").split("@")[0];

  try { await carregarFavoritos(user.uid); } catch (_) {}
  try { await carregarInscricoes(user.uid); } catch (_) {}

  await carregarEventos();
});