document.addEventListener("DOMContentLoaded", () => {
    const listaEventosEl = document.getElementById("lista-eventos");
    const filtroTipoEl = document.getElementById("filtro-tipo");
    const pesquisaEl = document.getElementById("pesquisa-eventos");

    if (!listaEventosEl) return;

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
    imagem: "imagens/IA.webp",
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
            imagem: "imagens/torneio.jpg", // <<< TENS ESTE NOME
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
            imagem: "imagens/natal.jpg", // <<< TENS ESTE NOME
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
            imagem: "imagens/workshop_ciber.jpg", // <<< TENS ESTE NOME
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
            imagem: "imagens/festival_cultural.jpg", // imagem enviada por ti
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
            imagem: "imagens/corrida_solidaria.jpg", // imagem enviada por ti
            descricao:
                "Uma corrida de 5km aberta à comunidade académica e ao público, com medalhas para os primeiros classificados."
        }
    ];

    function filtrarEventos() {
        const termo = pesquisaEl.value.toLowerCase().trim();
        const tipo = filtroTipoEl.value;

        return eventos.filter(ev => {
            const matchTipo = tipo === "todos" || ev.tipo === tipo;
            const texto = (ev.titulo + ev.descricao + ev.local).toLowerCase();
            const matchPesquisa = termo === "" || texto.includes(termo);
            return matchTipo && matchPesquisa;
        });
    }

    function renderEventos(lista) {
        if (!lista.length) {
            listaEventosEl.innerHTML = `<p class="sem-resultados">Nenhum evento encontrado.</p>`;
            return;
        }

        listaEventosEl.innerHTML = lista.map(ev => `
            <article class="cartao-evento">
                <div class="cartao-imagem">
                    <img src="${ev.imagem}" alt="${ev.titulo}">
                </div>
                <div class="cartao-corpo">
                    <p class="cartao-data">${ev.dataTexto} · ${ev.horario}</p>
                    <h3 class="cartao-titulo">${ev.titulo}</h3>
                    <p class="cartao-local">${ev.local}</p>
                    <p class="cartao-descricao">${ev.descricao}</p>

                    <div class="cartao-meta">
                        <span>Capacidade: ${ev.capacidade} pessoas</span>
                        <span class="cartao-preco">${ev.preco}</span>
                    </div>

                    <div class="cartao-footer">
                        <span class="cartao-tipo cartao-tipo-${ev.tipo}">
                            ${ev.tipo.charAt(0).toUpperCase() + ev.tipo.slice(1)}
                        </span>
                        <a href="login.html" class="btn-inscrever">Inscrever</a>
                    </div>
                </div>
            </article>
        `).join("");
    }

    renderEventos(filtrarEventos());
    filtroTipoEl.addEventListener("change", () => renderEventos(filtrarEventos()));
    pesquisaEl.addEventListener("input", () => renderEventos(filtrarEventos()));
});


