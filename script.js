"use strict";


/* =====================================================
   CONFIGURAÇÕES
===================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbznlbSb8CjpyRPbxv7w5xI9K3gRFrx-pANDryaaykBxrN3TPzDUk5WyArM_obZRpia5/exec";

const INTERVALO_ATUALIZACAO = 5000;


/* =====================================================
   VARIÁVEIS DOS GRÁFICOS
===================================================== */

let graficoNivel = null;
let graficoTemperatura = null;
let graficoPh = null;
let graficoTurbidez = null;


/* =====================================================
   ELEMENTOS DA PÁGINA
===================================================== */

const elementos = {

    nivel:
        document.getElementById("nivelAtual"),

    temperatura:
        document.getElementById("temperaturaAtual"),

    ph:
        document.getElementById("phAtual"),

    turbidez:
        document.getElementById("turbidezAtual"),

    tabela:
        document.getElementById("tabelaHistorico"),

    atualizacao:
        document.getElementById("ultimaAtualizacao"),

    statusIndicator:
        document.getElementById("statusIndicator"),

    statusText:
        document.getElementById("statusText"),

    botaoAtualizar:
        document.getElementById("botaoAtualizar")
};


/* =====================================================
   FORMATAÇÃO DE NÚMEROS
===================================================== */

function formatarNumero(valor, casas = 2) {

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "--";
    }

    return numero.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: casas
        }
    );
}


/* =====================================================
   FORMATAÇÃO DE DATA
===================================================== */

function formatarData(data) {

    if (!data) {
        return "--";
    }

    const objetoData = new Date(data);

    if (Number.isNaN(objetoData.getTime())) {
        return String(data);
    }

    return objetoData.toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "medium"
        }
    );
}


/* =====================================================
   STATUS DA CONEXÃO
===================================================== */

function atualizarStatus(online) {

    elementos.statusIndicator.classList.remove(
        "online",
        "offline"
    );

    if (online) {

        elementos.statusIndicator.classList.add(
            "online"
        );

        elementos.statusText.textContent =
            "Sistema conectado";

    } else {

        elementos.statusIndicator.classList.add(
            "offline"
        );

        elementos.statusText.textContent =
            "Sistema desconectado";
    }
}


/* =====================================================
   BUSCAR DADOS DA API
===================================================== */

async function buscarDados() {

    try {

        const resposta = await fetch(
            API_URL +
            "?t=" +
            Date.now(),
            {
                method: "GET",
                cache: "no-store"
            }
        );


        if (!resposta.ok) {

            throw new Error(
                `HTTP ${resposta.status}`
            );

        }


        const resultado =
            await resposta.json();


        if (!resultado.sucesso) {

            throw new Error(
                resultado.erro ||
                "Erro retornado pela API."
            );

        }


        const dados =
            Array.isArray(resultado.dados)
                ? resultado.dados
                : [];


        atualizarStatus(true);

        processarDados(dados);


    } catch (erro) {

        console.error(
            "Erro ao buscar dados:",
            erro
        );

        atualizarStatus(false);

        elementos.atualizacao.textContent =
            "Erro ao conectar com a API";
    }
}


/* =====================================================
   PROCESSAMENTO
===================================================== */

function processarDados(dados) {

    if (dados.length === 0) {

        mostrarSemDados();

        return;
    }


    const ultimo =
        dados[dados.length - 1];


    atualizarCards(ultimo);

    atualizarTabela(dados);

    atualizarGraficos(dados);


    elementos.atualizacao.textContent =
        formatarData(ultimo.dataHora);
}


/* =====================================================
   CARDS
===================================================== */

function atualizarCards(ultimo) {

    elementos.nivel.textContent =
        formatarNumero(
            ultimo.nivel,
            1
        ) + " cm";


    elementos.temperatura.textContent =
        formatarNumero(
            ultimo.temperatura,
            1
        ) + " °C";


    elementos.ph.textContent =
        formatarNumero(
            ultimo.ph,
            2
        );


    elementos.turbidez.textContent =
        formatarNumero(
            ultimo.turbidez,
            1
        ) + " NTU";
}


/* =====================================================
   SEM DADOS
===================================================== */

function mostrarSemDados() {

    elementos.nivel.textContent =
        "--";

    elementos.temperatura.textContent =
        "--";

    elementos.ph.textContent =
        "--";

    elementos.turbidez.textContent =
        "--";


    elementos.tabela.innerHTML = `

        <tr>

            <td
                colspan="5"
                class="text-center py-5"
            >

                <i class="bi bi-database fs-3 d-block mb-2"></i>

                Nenhum registro encontrado.

            </td>

        </tr>

    `;


    elementos.atualizacao.textContent =
        "Nenhum dado disponível";


    destruirGraficos();
}


/* =====================================================
   TABELA
===================================================== */

function atualizarTabela(dados) {

    elementos.tabela.innerHTML = "";


    dados
        .slice()
        .reverse()
        .forEach(item => {

            const linha =
                document.createElement("tr");


            linha.innerHTML = `

                <td>
                    ${formatarData(item.dataHora)}
                </td>

                <td>
                    ${formatarNumero(item.nivel, 1)}
                    cm
                </td>

                <td>
                    ${formatarNumero(item.temperatura, 1)}
                    °C
                </td>

                <td>
                    ${formatarNumero(item.ph, 2)}
                </td>

                <td>
                    ${formatarNumero(item.turbidez, 1)}
                    NTU
                </td>

            `;


            elementos.tabela.appendChild(
                linha
            );

        });
}


/* =====================================================
   DADOS DOS GRÁFICOS
===================================================== */

function prepararValores(dados, campo) {

    return dados.map(item => {

        const valor =
            Number(item[campo]);

        return Number.isFinite(valor)
            ? valor
            : 0;

    });
}


/* =====================================================
   LABELS DOS GRÁFICOS
===================================================== */

function prepararLabels(dados) {

    return dados.map(
        item =>
            formatarData(
                item.dataHora
            )
    );
}


/* =====================================================
   CONFIGURAÇÕES DOS GRÁFICOS
===================================================== */

function opcoesGrafico(unidade) {

    return {

        responsive: true,

        maintainAspectRatio: false,

        interaction: {

            intersect: false,

            mode: "index"

        },

        plugins: {

            legend: {
                display: false
            },

            tooltip: {

                callbacks: {

                    label: function(context) {

                        return (
                            " " +
                            formatarNumero(
                                context.parsed.y,
                                2
                            ) +
                            " " +
                            unidade
                        );

                    }

                }

            }

        },

        scales: {

            x: {

                grid: {
                    display: false
                },

                ticks: {

                    color:
                        "rgba(255,255,255,0.55)",

                    maxTicksLimit: 8,

                    maxRotation: 0

                }

            },

            y: {

                beginAtZero: false,

                grid: {

                    color:
                        "rgba(255,255,255,0.08)"

                },

                ticks: {

                    color:
                        "rgba(255,255,255,0.55)"

                }

            }

        }

    };
}


/* =====================================================
   CRIAR GRÁFICO
===================================================== */

function criarGrafico(
    canvasId,
    labels,
    valores,
    unidade,
    titulo
) {

    const canvas =
        document.getElementById(canvasId);


    return new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {

                        label: titulo,

                        data: valores,

                        borderColor:
                            "#00c2d1",

                        backgroundColor:
                            "rgba(0,194,209,0.10)",

                        borderWidth: 2,

                        pointRadius: 2,

                        pointHoverRadius: 5,

                        tension: 0.35,

                        fill: true

                    }

                ]

            },

            options:
                opcoesGrafico(unidade)

        }
    );
}


/* =====================================================
   ATUALIZAR GRÁFICOS
===================================================== */

function atualizarGraficos(dados) {

    destruirGraficos();


    const labels =
        prepararLabels(dados);


    graficoNivel =
        criarGrafico(
            "graficoNivel",
            labels,
            prepararValores(
                dados,
                "nivel"
            ),
            "cm",
            "Nível"
        );


    graficoTemperatura =
        criarGrafico(
            "graficoTemperatura",
            labels,
            prepararValores(
                dados,
                "temperatura"
            ),
            "°C",
            "Temperatura"
        );


    graficoPh =
        criarGrafico(
            "graficoPh",
            labels,
            prepararValores(
                dados,
                "ph"
            ),
            "pH",
            "pH"
        );


    graficoTurbidez =
        criarGrafico(
            "graficoTurbidez",
            labels,
            prepararValores(
                dados,
                "turbidez"
            ),
            "NTU",
            "Turbidez"
        );
}


/* =====================================================
   DESTRUIR GRÁFICOS
===================================================== */

function destruirGraficos() {

    if (graficoNivel) {

        graficoNivel.destroy();

        graficoNivel = null;
    }


    if (graficoTemperatura) {

        graficoTemperatura.destroy();

        graficoTemperatura = null;
    }


    if (graficoPh) {

        graficoPh.destroy();

        graficoPh = null;
    }


    if (graficoTurbidez) {

        graficoTurbidez.destroy();

        graficoTurbidez = null;
    }
}


/* =====================================================
   BOTÃO DE ATUALIZAÇÃO
===================================================== */

function configurarBotaoAtualizar() {

    elementos.botaoAtualizar
        .addEventListener(
            "click",
            async () => {

                const icone =
                    elementos.botaoAtualizar
                        .querySelector("i");


                icone.classList.add(
                    "spin"
                );


                await buscarDados();


                icone.classList.remove(
                    "spin"
                );

            }
        );
}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        buscarDados();

        configurarBotaoAtualizar();


        setInterval(
            buscarDados,
            INTERVALO_ATUALIZACAO
        );

    }
);