
"use strict";

/* =====================================================
   CONFIGURACOES
===================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbznlbSb8CjpyRPbxv7w5xI9K3gRFrx-pANDryaaykBxrN3TPzDUk5WyArM_obZRpia5/exec";

const INTERVALO_ATUALIZACAO = 2000;


/* =====================================================
   VARIAVEIS DOS GRAFICOS
===================================================== */

let graficoNivel = null;
let graficoTemperatura = null;
let graficoPh = null;
let graficoTurbidez = null;


/* =====================================================
   ELEMENTOS DA PAGINA
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
   CAMPOS DOS SENSORES
===================================================== */

const CAMPOS_SENSORES = [
    "nivel",
    "temperatura",
    "ph",
    "turbidez"
];


/* =====================================================
   FORMATACAO DE NUMEROS
===================================================== */

function formatarNumero(valor, casas = 2) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return "--";
    }

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
   VERIFICAR VALOR
===================================================== */

function valorValido(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : null;

}


/* =====================================================
   FORMATACAO DE DATA
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
   STATUS DA CONEXAO
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
            API_URL + "?t=" + Date.now(),
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

        const estado =
            resultado.estado || {};

        atualizarStatus(true);

        processarDados(
            dados,
            estado
        );

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
   NORMALIZAR HISTORICO
===================================================== */

function normalizarHistorico(dados) {

    const estado = {

        nivel: null,
        temperatura: null,
        ph: null,
        turbidez: null

    };

    return dados.map(item => {

        const registro = {

            dataHora: item.dataHora

        };

        CAMPOS_SENSORES.forEach(campo => {

            const valor =
                valorValido(item[campo]);

            // Atualiza somente quando existe
            // uma nova leitura numérica.

            if (valor !== null) {

                estado[campo] = valor;

            }

            registro[campo] =
                estado[campo];

        });

        return registro;

    });

}


/* =====================================================
   RECUPERAR ULTIMO VALOR DE CADA SENSOR
===================================================== */

function recuperarUltimoEstado(
    dados,
    estadoAPI
) {

    const ultimo = {

        nivel: null,
        temperatura: null,
        ph: null,
        turbidez: null

    };

    // Recupera os últimos valores válidos
    // encontrados no histórico.

    dados.forEach(item => {

        CAMPOS_SENSORES.forEach(campo => {

            const valor =
                valorValido(item[campo]);

            if (valor !== null) {

                ultimo[campo] = valor;

            }

        });

    });

    // O estado atual da API tem prioridade.

    CAMPOS_SENSORES.forEach(campo => {

        const valor =
            valorValido(estadoAPI[campo]);

        if (valor !== null) {

            ultimo[campo] = valor;

        }

    });

    return ultimo;

}


/* =====================================================
   PROCESSAMENTO DOS DADOS
===================================================== */

function processarDados(
    dados,
    estadoAPI
) {

    const historico =
        normalizarHistorico(dados);

    const estadoAtual =
        recuperarUltimoEstado(
            dados,
            estadoAPI
        );

    atualizarCards(estadoAtual);

    if (historico.length > 0) {

        atualizarTabela(historico);

        atualizarGraficos(historico);

        const ultimoRegistro =
            historico[historico.length - 1];

        elementos.atualizacao.textContent =
            formatarData(
                ultimoRegistro.dataHora
            );

    } else {

        elementos.tabela.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    Nenhum registro encontrado.
                </td>
            </tr>
        `;

        destruirGraficos();

        elementos.atualizacao.textContent =
            "Aguardando primeiras leituras";

    }

}


/* =====================================================
   ATUALIZAR CARDS
===================================================== */

function atualizarCards(estado) {

    elementos.nivel.textContent =
        formatarNumero(
            estado.nivel,
            1
        ) + (
            estado.nivel !== null
                ? " cm"
                : ""
        );

    elementos.temperatura.textContent =
        formatarNumero(
            estado.temperatura,
            1
        ) + (
            estado.temperatura !== null
                ? " °C"
                : ""
        );

    elementos.ph.textContent =
        formatarNumero(
            estado.ph,
            2
        );

    elementos.turbidez.textContent =
        formatarNumero(
            estado.turbidez,
            2
        ) + (
            estado.turbidez !== null
                ? " NTU"
                : ""
        );

}


/* =====================================================
   TABELA DE HISTORICO
===================================================== */

function atualizarTabela(dados) {

    elementos.tabela.innerHTML = "";

    dados
        .slice()
        .reverse()
        .forEach(item => {

            const linha =
                document.createElement("tr");

            const valores = [

                formatarData(item.dataHora),

                formatarNumero(item.nivel, 1) +
                    (item.nivel !== null ? " cm" : ""),

                formatarNumero(item.temperatura, 1) +
                    (item.temperatura !== null ? " °C" : ""),

                formatarNumero(item.ph, 2),

                formatarNumero(item.turbidez, 1) +
                    (item.turbidez !== null ? " NTU" : "")

            ];

            valores.forEach(valor => {

                const celula =
                    document.createElement("td");

                celula.textContent = valor;

                linha.appendChild(celula);

            });

            elementos.tabela.appendChild(linha);

        });

}


/* =====================================================
   DADOS DOS GRAFICOS
===================================================== */

function prepararValores(dados, campo) {

    return dados.map(item => {

        const valor = item[campo];

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {

            return null;

        }

        const numero = Number(valor);

        return Number.isFinite(numero)
            ? numero
            : null;

    });

}


/* =====================================================
   LABELS DOS GRAFICOS
===================================================== */

function prepararLabels(dados) {

    return dados.map(
        item => formatarData(item.dataHora)
    );

}


/* =====================================================
   CONFIGURACOES DOS GRAFICOS
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

                        if (context.parsed.y === null) {

                            return " Sem leitura";

                        }

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
   CRIAR GRAFICO
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

    if (!canvas) {

        console.error(
            "Canvas não encontrado:",
            canvasId
        );

        return null;

    }

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

                        fill: true,

                        spanGaps: false

                    }

                ]

            },

            options:
                opcoesGrafico(unidade)

        }

    );

}


/* =====================================================
   ATUALIZAR GRAFICOS
===================================================== */

function atualizarGraficos(dados) {

    destruirGraficos();

    const labels =
        prepararLabels(dados);

    graficoNivel =
        criarGrafico(
            "graficoNivel",
            labels,
            prepararValores(dados, "nivel"),
            "cm",
            "Nível"
        );

    graficoTemperatura =
        criarGrafico(
            "graficoTemperatura",
            labels,
            prepararValores(dados, "temperatura"),
            "°C",
            "Temperatura"
        );

    graficoPh =
        criarGrafico(
            "graficoPh",
            labels,
            prepararValores(dados, "ph"),
            "pH",
            "pH"
        );

    graficoTurbidez =
        criarGrafico(
            "graficoTurbidez",
            labels,
            prepararValores(dados, "turbidez"),
            "NTU",
            "Turbidez"
        );

}


/* =====================================================
   DESTRUIR GRAFICOS
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
   BOTAO DE ATUALIZACAO
===================================================== */

function configurarBotaoAtualizar() {

    if (!elementos.botaoAtualizar) {
        return;
    }

    elementos.botaoAtualizar.addEventListener(
        "click",
        async () => {

            const icone =
                elementos.botaoAtualizar.querySelector("i");

            if (icone) {

                icone.classList.add("spin");

            }

            await buscarDados();

            if (icone) {

                icone.classList.remove("spin");

            }

        }

    );

}


/* =====================================================
   INICIALIZACAO
===================================================== */

function inicializarWaterVision() {

    buscarDados();

    configurarBotaoAtualizar();

    setInterval(
        buscarDados,
        INTERVALO_ATUALIZACAO
    );

}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarWaterVision
    );

} else {

    inicializarWaterVision();

}
