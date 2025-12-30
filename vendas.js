import { db, auth } from './firebase_connection.js';

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        carregarKPIs(user.uid);
    });
});

async function carregarKPIs(organizadorUid) {
    const container = document.getElementById('container-kpis-eventos');
    
    try {
        // 1. Procura os eventos onde o utilizador logado é o responsável
        const eventosSnapshot = await db.collection("eventos")
            .where("responsavel_uid", "==", organizadorUid)
            .get();

        if (eventosSnapshot.empty) {
            container.innerHTML = "<p>Ainda não criou eventos para análise.</p>";
            return;
        }

        let htmlFinal = "";

        // 2. Itera sobre cada evento para calcular as métricas baseadas nas inscrições
        for (const docEvento of eventosSnapshot.docs) {
            const evento = docEvento.data();
            const eventoId = docEvento.id; // Este é o ID que deve estar no uid_evento das inscrições

            // Procura as inscrições associadas a este evento específico
            const vendasSnapshot = await db.collection("inscricoes")
                .where("uid_evento", "==", eventoId)
                .get();

            let totalFaturado = 0;
            let totalBilhetes = vendasSnapshot.size;
            let contagemTipos = { normal: 0, vip: 0 };

            vendasSnapshot.forEach(docInscricao => {
                const inscricao = docInscricao.data();
                
                // KPI: Total Faturado (soma o valor_pago)
                totalFaturado += (inscricao.valor_pago || 0);
                
                // Contagem por tipo para descobrir o bilhete mais popular
                const tipo = (inscricao.tipo_bilhete || 'normal').toLowerCase();
                if (tipo === 'normal') contagemTipos.normal++;
                if (tipo === 'vip') contagemTipos.vip++;
            });

            // Lógica para Tipo de Bilhete Mais Vendido
            let tipoMaisVendido = "N/A";
            if (contagemTipos.normal > contagemTipos.vip) tipoMaisVendido = "Normal";
            else if (contagemTipos.vip > contagemTipos.normal) tipoMaisVendido = "VIP";
            else if (totalBilhetes > 0) tipoMaisVendido = "Empate";

            // KPI: Inscrições Totais vs Capacidade
            const capacidade = evento.max_participantes || 0;
            const percentagemOcupacao = capacidade > 0 
                ? ((totalBilhetes / capacidade) * 100).toFixed(1) 
                : 0;

            // Injeção do HTML do Card de KPI
            htmlFinal += `
                <section class="card-kpi">
                    <div class="header-evento">
                        <h2>${evento.nome}</h2>
                        <span class="status-badge">${evento.estado}</span>
                    </div>
                    
                    <div class="grid-kpis">
                        <div class="kpi-item">
                            <span class="label">Total Faturado</span>
                            <span class="valor faturado">${totalFaturado.toFixed(2)}€</span>
                        </div>

                        <div class="kpi-item">
                            <span class="label">Total de Bilhetes Vendidos</span>
                            <span class="valor">${totalBilhetes}</span>
                        </div>

                        <div class="kpi-item">
                            <span class="label">Capacidade de Ocupação</span>
                            <span class="valor">${percentagemOcupacao}%</span>
                            <small>${totalBilhetes} de ${capacidade} inscritos</small>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(percentagemOcupacao, 100)}%"></div>
                            </div>
                        </div>

                        <div class="kpi-item">
                            <span class="label">Bilhete mais Comprado</span>
                            <span class="valor">Normal / Vip</span>
                            <small>Normal: ${contagemTipos.normal} | VIP: ${contagemTipos.vip}</small>
                        </div>
                    </div>
                </section>
            `;
        }

        container.innerHTML = htmlFinal;

    } catch (error) {
        console.error("Erro detalhado ao carregar KPIs:", error);
        container.innerHTML = "<p>Erro ao processar dados de desempenho.</p>";
    }
}