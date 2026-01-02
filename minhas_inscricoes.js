import { db, auth } from "./firebase_connection.js";

// Firebase v8 global
const firebase = window.firebase;

const listaEl = document.getElementById("lista-inscricoes");
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

function tsToDateString(ts) {
  try {
    if (!ts) return "—";
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-PT");
  } catch {
    return "—";
  }
}

function getEventoParam() {
  const p = new URLSearchParams(window.location.search);
  return p.get("evento"); // minhas_inscricoes.html?evento=...
}

function renderInscricoes(inscricoes) {
  if (!inscricoes.length) {
    listaEl.innerHTML = `
      <div class="ticket-empty">
        <h3>Ainda não tens inscrições</h3>
        <p>Vai a “Explorar Eventos” e inscreve-te num evento para gerar o bilhete.</p>
        <a class="btn-go" href="explorar_eventos.html"><i class="fas fa-search"></i> Explorar eventos</a>
      </div>
    `;
    return;
  }

  listaEl.innerHTML = inscricoes.map((i) => {
    const tipo = (i.tipo_bilhete || "normal").toUpperCase();
    const valor = euro(i.valor_pago ?? 0);

    return `
      <div class="ticket-card" id="ticket-${i.__docId}">
        <div class="ticket-head">
          <div>
            <h3 class="ticket-title">${i.evento_nome || "Evento"}</h3>
            <div class="ticket-sub">
              <span><i class="fas fa-map-marker-alt"></i> ${i.evento_local || "—"}</span>
              <span><i class="fas fa-calendar-alt"></i> ${i.evento_data_string || "—"}${i.evento_hora_string ? " · " + i.evento_hora_string : ""}</span>
            </div>
          </div>

          <div class="ticket-badge ${tipo === "VIP" ? "vip" : "normal"}">
            ${tipo}
          </div>
        </div>

        <div class="ticket-body">
          <div class="ticket-info">
            <p><strong>Nome:</strong> ${i.nome || "—"}</p>
            <p><strong>Email:</strong> ${i.email || "—"}</p>
            <p><strong>Idade:</strong> ${i.idade ?? "—"}</p>
            <p><strong>Pago:</strong> ${valor}</p>
            <p><strong>Estado:</strong> ${i.estado_pagamento || "—"}</p>
            <p class="ticket-date"><strong>Gerado em:</strong> ${tsToDateString(i.criadoEm)}</p>
          </div>

          <div class="ticket-qr">
            <div class="qr-box" id="qr-${i.__docId}"></div>
            <div class="qr-hint">Mostra este QR Code na entrada</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // gerar QRs
  inscricoes.forEach((i) => {
    const el = document.getElementById(`qr-${i.__docId}`);
    if (!el) return;

    el.innerHTML = "";
    // eslint-disable-next-line no-undef
    new QRCode(el, {
      text: i.qr_data || `IPCA|uid=${i.uid_user}|evento=${i.uid_evento}`,
      width: 160,
      height: 160
    });
  });
}

function destacarTicket(docId) {
  const el = document.getElementById(`ticket-${docId}`);
  if (!el) return;

  el.classList.add("ticket-destaque");

  // scroll suave até ao bilhete
  setTimeout(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);

  // remove o destaque passado uns segundos
  setTimeout(() => {
    el.classList.remove("ticket-destaque");
  }, 3500);
}

async function carregarInscricoes(uid) {
  try {
    listaEl.innerHTML = `<p class="widget-detalhe">A carregar bilhetes...</p>`;

    const snap = await db.collection("inscricoes")
      .where("uid_user", "==", uid)
      .get();

    let arr = [];
    snap.forEach((doc) => {
      arr.push({ __docId: doc.id, ...doc.data() });
    });

    // ordenar por criadoEm desc
    arr.sort((a, b) => {
      const ta = a.criadoEm?.toMillis ? a.criadoEm.toMillis() : 0;
      const tb = b.criadoEm?.toMillis ? b.criadoEm.toMillis() : 0;
      return tb - ta;
    });

    // ✅ se veio do Dashboard com ?evento=...
    const eventoId = getEventoParam();
    let docParaDestacar = null;

    if (eventoId) {
      const idx = arr.findIndex((x) => String(x.uid_evento) === String(eventoId));
      if (idx !== -1) {
        const ticket = arr[idx];
        docParaDestacar = ticket.__docId;

        // mover para o topo
        arr = [ticket, ...arr.filter((_, i) => i !== idx)];
      }
    }

    renderInscricoes(arr);

    if (docParaDestacar) destacarTicket(docParaDestacar);

  } catch (err) {
    showErro("ERRO a carregar inscrições: " + (err?.message || String(err)));
    listaEl.innerHTML = `<p class="widget-detalhe">Erro ao carregar bilhetes.</p>`;
  }
}

// Logout
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

aplicarSidebarToggle();

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  nomeEl.textContent = (user.email || "Utilizador").split("@")[0];
  await carregarInscricoes(user.uid);
});