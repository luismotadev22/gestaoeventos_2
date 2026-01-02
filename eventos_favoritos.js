import { db, auth } from "./firebase_connection.js";

const firebase = window.firebase;

const listaEl = document.getElementById("lista-favoritos");
const pesquisaEl = document.getElementById("pesquisa");
const nomeEl = document.getElementById("display-nome-utilizador");
const btnLogout = document.getElementById("btn-logout");
const debugErro = document.getElementById("debug-erro");

// sidebar toggle
const toggleBtn = document.getElementById("toggle-sidebar");
const container = document.getElementById("dashboard-container");

let favoritos = [];
let currentUser = null;
let inscritoEventos = new Set();
let eventoModalAtual = null;

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
function garantirModal() {
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
    if (eventoModalAtual) atualizarPrecoNoModal(eventoModalAtual);
  });

  document.getElementById("form-inscricao").addEventListener("submit", async (e) => {
    e.preventDefault();
    await confirmarInscricao();
  });

  window.__closeInscricaoModal = close;
}

function atualizarPrecoNoModal(ev) {
  const tipo = document.getElementById("modal-tipo").value;
  const normal = ev?.precos?.normal;
  const vip = ev?.precos?.vip;
  const p = tipo === "vip" ? vip : normal;

  document.getElementById("modal-preco").textContent =
    `Preço (${tipo.toUpperCase()}): ${p == null ? "—" : euro(p)}`;
}

function openModal(ev) {
  garantirModal();
  eventoModalAtual = ev;

  document.getElementById("modal-inscricao-titulo").textContent = `Inscrição — ${ev.nome || "Evento"}`;
  document.getElementById("modal-inscricao-sub").textContent =
    `${ev.local || "—"} · ${ev.data_string || "—"}${ev.hora_string ? " · " + ev.hora_string : ""}`;

  document.getElementById("modal-evento-id").value = ev.id;
  document.getElementById("modal-nome").value = "";
  document.getElementById("modal-email").value = currentUser?.email || "";
  document.getElementById("modal-idade").value = "";
  document.getElementById("modal-tipo").value = "normal";

  atualizarPrecoNoModal(ev);
  document.getElementById("modal-inscricao-backdrop").style.display = "flex";
}

/* =========================
   INSCRIÇÃO
========================= */
async function confirmarInscricao() {
  const eventoId = document.getElementById("modal-evento-id").value;
  const ev = eventoModalAtual;
  if (!ev || ev.id !== eventoId) return;

  if (inscritoEventos.has(eventoId)) {
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
        inscritoEventos.add(eventoId);
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

      inscritoEventos.add(eventoId);
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
   FAVORITOS / INSCRITOS
========================= */
async function carregarFavoritos(uid) {
  const snap = await db.collection("utilizadores").doc(uid).collection("favoritos").get();
  favoritos = [];
  snap.forEach((doc) => favoritos.push({ __id: doc.id, ...doc.data() }));
}

async function carregarInscricoesDoUser(uid) {
  const snap = await db.collection("inscricoes").where("uid_user", "==", uid).get();
  inscritoEventos = new Set();
  snap.forEach((doc) => {
    const d = doc.data();
    if (d?.uid_evento) inscritoEventos.add(d.uid_evento);
  });
}

async function removerFavorito(eventoId) {
  await db.collection("utilizadores").doc(currentUser.uid).collection("favoritos").doc(eventoId).delete();
  favoritos = favoritos.filter((f) => f.__id !== eventoId);
  render();
}

/* =========================
   UI
========================= */
function cardFavorito(f) {
  const normal = f?.precos?.normal;
  const vip = f?.precos?.vip;

  const eventoId = f.__id;
  const jaInscrito = inscritoEventos.has(eventoId);

  return `
    <div class="fav-card">
      <div class="fav-top">
        <h3 class="fav-title">${f.nome || "Evento"}</h3>
        <span class="fav-tag">${(f.tipo || "academico").toUpperCase()}</span>
      </div>

      <div class="fav-info">
        <div><i class="fas fa-calendar-alt"></i> ${f.data_string || "—"}${f.hora_string ? " · " + f.hora_string : ""}</div>
        <div><i class="fas fa-map-marker-alt"></i> ${f.local || "—"}</div>
        <div><i class="fas fa-euro-sign"></i> Normal: ${normal == null ? "—" : euro(normal)} | VIP: ${vip == null ? "—" : euro(vip)}</div>
      </div>

      <div class="fav-actions">
        ${
          jaInscrito
            ? `<div class="badge-inscrito"><i class="fas fa-check-circle"></i> Inscrito</div>`
            : `<button class="btn-primary btn-inscrever" data-id="${eventoId}">
                 <i class="fas fa-ticket-alt"></i> Inscrever
               </button>`
        }

        <button class="btn-danger btn-remover" data-id="${eventoId}">
          <i class="fas fa-trash"></i> Remover
        </button>
      </div>
    </div>
  `;
}

function render() {
  const termo = (pesquisaEl.value || "").toLowerCase().trim();

  const filtrados = favoritos.filter((f) => {
    const texto = `${f.nome || ""} ${f.local || ""}`.toLowerCase();
    return !termo || texto.includes(termo);
  });

  if (!filtrados.length) {
    listaEl.innerHTML = `
      <div class="fav-empty">
        <h3>Sem favoritos</h3>
        <p>Ainda não guardaste nenhum evento. Vai a “Explorar Eventos” e adiciona aos favoritos.</p>
        <a class="btn-primary" href="explorar_eventos.html"><i class="fas fa-search"></i> Explorar eventos</a>
      </div>
    `;
    return;
  }

  listaEl.innerHTML = filtrados.map(cardFavorito).join("");
}

async function inscreverDireto(eventoId) {
  if (inscritoEventos.has(eventoId)) {
    mostrarSucessoInscricao("Evento");
    return;
  }

  // tentar buscar evento real (melhor info)
  let ev = null;
  try {
    const doc = await db.collection("eventos").doc(eventoId).get();
    if (doc.exists) ev = { id: doc.id, ...doc.data() };
  } catch (_) {}

  // fallback para favorito
  if (!ev) {
    const f = favoritos.find((x) => x.__id === eventoId);
    if (!f) return;
    ev = {
      id: eventoId,
      nome: f.nome || "",
      local: f.local || "",
      tipo: f.tipo || "academico",
      data_string: f.data_string || "",
      hora_string: f.hora_string || "",
      precos: f.precos || {},
    };
  }

  openModal(ev);
}

/* =========================
   LISTENERS
========================= */
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

aplicarSidebarToggle();
pesquisaEl.addEventListener("input", render);

listaEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.classList.contains("btn-remover")) {
    const id = btn.getAttribute("data-id");
    if (!id) return;
    btn.disabled = true;
    try {
      await removerFavorito(id);
    } catch (err) {
      showErro("Erro ao remover favorito: " + (err?.message || String(err)));
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (btn.classList.contains("btn-inscrever")) {
    const id = btn.getAttribute("data-id");
    if (!id) return;
    btn.disabled = true;
    try {
      await inscreverDireto(id);
    } catch (err) {
      showErro("Erro ao abrir inscrição: " + (err?.message || String(err)));
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

  try {
    listaEl.innerHTML = `<p class="widget-detalhe">A carregar favoritos...</p>`;
    await carregarFavoritos(user.uid);
    await carregarInscricoesDoUser(user.uid);
    render();
  } catch (err) {
    showErro("ERRO: " + (err?.message || String(err)));
    listaEl.innerHTML = `<p class="widget-detalhe">Erro ao carregar favoritos.</p>`;
  }
});