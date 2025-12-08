document.addEventListener("DOMContentLoaded", () => {
    const gradeCalendario = document.getElementById("grade-calendario");
    const mesAnoEl = document.getElementById("mes-ano");
    const btnMesAnterior = document.getElementById("mes-anterior");
    const btnMesSeguinte = document.getElementById("mes-seguinte");

    const modal = document.getElementById("modal-evento");
    const modalOverlay = modal.querySelector(".modal-overlay");
    const fecharModalBtn = document.getElementById("fechar-modal");
    const modalTitulo = document.getElementById("modal-titulo");
    const modalData = document.getElementById("modal-data");
    const modalListaEventos = document.getElementById("modal-lista-eventos");
    const modalInscrever = document.getElementById("modal-inscrever");

    if (!gradeCalendario) return;

    // --- MESMOS EVENTOS QUE EM eventos.js ---
    const eventos = [
        {
            id: 1,
            titulo: "Seminário de Inteligência Artificial",
            data: "2026-02-10",
            dataTexto: "10 FEV, 2026",
            horario: "10:00 - 12:30",
            tipo: "academico",
            local: "Auditório Principal do IPCA",
            capacidade: 150,
            preco: "Entrada gratuita",
            descricao:
                "Uma palestra sobre o futuro da IA, casos de uso reais e o impacto na academia e nas empresas."
        },
        {
            id: 2,
            titulo: "Torneio Desportivo IPCA - Primavera",
            data: "2026-03-05",
            dataTexto: "05 MAR, 2026",
            horario: "14:00 - 18:00",
            tipo: "desportivo",
            local: "Complexo Desportivo do IPCA",
            capacidade: 200,
            preco: "5€ por participante",
            descricao:
                "Forma a tua equipa e participa nas competições de futebol, basquetebol e voleibol do IPCA."
        },
        {
            id: 3,
            titulo: "Concerto de Natal da Tuna",
            data: "2026-12-12",
            dataTexto: "12 DEZ, 2026",
            horario: "21:00 - 23:00",
            tipo: "cultural",
            local: "Auditório IPCA",
            capacidade: 300,
            preco: "3€ bilhete estudante | 5€ público geral",
            descricao:
                "Uma noite cultural com atuações das tunas académicas, convidados especiais e surpresas de Natal."
        },
        {
            id: 4,
            titulo: "Workshop de Cibersegurança para Estudantes",
            data: "2026-02-24",
            dataTexto: "24 FEV, 2026",
            horario: "09:30 - 12:00",
            tipo: "academico",
            local: "Laboratório de Informática 2",
            capacidade: 40,
            preco: "7€ por participante",
            descricao:
                "Aprende as noções fundamentais de segurança digital, boas práticas online e proteção de dados pessoais."
        },
        {
            id: 5,
            titulo: "Festival Cultural IPCA",
            data: "2026-05-20",
            dataTexto: "20 MAI, 2026",
            horario: "16:00 - 23:00",
            tipo: "cultural",
            local: "Pátio Exterior do IPCA",
            capacidade: 500,
            preco: "Entrada gratuita",
            descricao:
                "Música ao vivo, dança, bancas de comida e exposições artísticas organizadas pelos estudantes."
        },
        {
            id: 6,
            titulo: "Corrida Académica Solidária",
            data: "2026-04-14",
            dataTexto: "14 ABR, 2026",
            horario: "09:00 - 11:30",
            tipo: "desportivo",
            local: "Ponto de partida: Campus do IPCA",
            capacidade: 300,
            preco: "10€ (reverte para instituição solidária)",
            descricao:
                "Uma corrida de 5km aberta à comunidade académica e ao público, com medalhas para os primeiros classificados."
        }
    ];

    const MESES = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Começar no mês do primeiro evento (fevereiro 2026)
    let currentYear = 2026;
    let currentMonth = 1; // 0 = Jan, 1 = Fev

    // --- Funções auxiliares ---

    function dataToISO(ano, mesIndex, dia) {
        const m = String(mesIndex + 1).padStart(2, "0");
        const d = String(dia).padStart(2, "0");
        return `${ano}-${m}-${d}`;
    }

    function formatarDataExtenso(iso) {
        const [ano, mes, dia] = iso.split("-").map(Number);
        const data = new Date(ano, mes - 1, dia);
        const formatado = data.toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
        // Capitalizar primeira letra
        return formatado.charAt(0).toUpperCase() + formatado.slice(1);
    }

    function obterEventosDoDia(iso) {
        return eventos.filter(ev => ev.data === iso);
    }

    // --- Render do calendário ---

    function renderCalendario() {
        gradeCalendario.innerHTML = "";

        mesAnoEl.textContent = `${MESES[currentMonth]} ${currentYear}`;

        const primeiroDia = new Date(currentYear, currentMonth, 1);
        const indiceSemanaPrimeiroDia = (primeiroDia.getDay() + 6) % 7; // Ajustar para começar em segunda
        const diasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Dias vazios antes do dia 1
        for (let i = 0; i < indiceSemanaPrimeiroDia; i++) {
            const div = document.createElement("div");
            div.classList.add("dia", "vazio");
            gradeCalendario.appendChild(div);
        }

        // Dias do mês
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const iso = dataToISO(currentYear, currentMonth, dia);
            const eventosDia = obterEventosDoDia(iso);

            const btnDia = document.createElement("button");
            btnDia.classList.add("dia");

            const spanNumero = document.createElement("span");
            spanNumero.classList.add("numero-dia");
            spanNumero.textContent = dia;
            btnDia.appendChild(spanNumero);

            if (eventosDia.length) {
                btnDia.classList.add("com-evento");

                const ponto = document.createElement("span");
                ponto.classList.add("ponto-evento");
                btnDia.appendChild(ponto);

                const resumo = document.createElement("span");
                resumo.classList.add("resumo-evento");
                resumo.textContent =
                    eventosDia.length === 1
                        ? eventosDia[0].titulo
                        : `${eventosDia.length} eventos`;
                btnDia.appendChild(resumo);

                btnDia.addEventListener("click", () => abrirModalEventos(iso, eventosDia));
            }

            gradeCalendario.appendChild(btnDia);
        }
    }

    // --- Modal ---

    function abrirModalEventos(dataISO, eventosDia) {
        modal.classList.remove("oculto");

        const dataExtenso = formatarDataExtenso(dataISO);
        modalData.textContent = dataExtenso;

        if (eventosDia.length === 1) {
            modalTitulo.textContent = eventosDia[0].titulo;
        } else {
            modalTitulo.textContent = "Eventos neste dia";
        }

        modalListaEventos.innerHTML = eventosDia
            .map(ev => {
                return `
                <div class="modal-evento-item">
                    <h3>${ev.titulo}</h3>
                    <div class="meta">
                        ${ev.horario} · ${ev.local}<br>
                        Capacidade: ${ev.capacidade} pessoas · ${ev.preco}
                    </div>
                    <p>${ev.descricao}</p>
                </div>
                `;
            })
            .join("");
    }

    function fecharModal() {
        modal.classList.add("oculto");
    }

    // --- Listeners ---

    btnMesAnterior.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendario();
    });

    btnMesSeguinte.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendario();
    });

    fecharModalBtn.addEventListener("click", fecharModal);
    modalOverlay.addEventListener("click", fecharModal);

    modalInscrever.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    // --- Render inicial ---
    renderCalendario();
});


