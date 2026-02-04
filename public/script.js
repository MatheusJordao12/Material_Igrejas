const isAdmin = sessionStorage.getItem("adminMode") === "true";
(function () {

const siglasDias = {
    "Domingo": "DOM",
    "Sábado": "SAB",
    "Quarta": "QUA"
};

const horasPorDia = { Domingo: "18:30", Quarta: "19:30", Sábado: "08:30" };
const diasUteis = ["Domingo", "Quarta", "Sábado"];
const diasSemana = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
let sequenciaEscala = {};
const chaveRevezamento = "ultimoRevezamento";
let ultimoRevezamento = JSON.parse(
    localStorage.getItem(chaveRevezamento)
) || {};

const hoje = new Date();
const mesAtual = hoje.getMonth() + 1;
const anoAtual = hoje.getFullYear();
const membrosPorDia = {
    Domingo: 3,
    Quarta: 3,
    Sábado: 3
};

const chaveEscala = `escala_${mesAtual}_${anoAtual}`;
const chaveMembros = "membros_sonoplastia";

let membros = JSON.parse(localStorage.getItem(chaveMembros)) || [];
let membroEditandoIndex = null;
const dependenciaSelect = document.getElementById("dependenciaSelect");
const hasDependencia = document.getElementById("hasDependencia");
const bloqueioSelect = document.getElementById("bloqueioSelect");
const hasBloqueio = document.getElementById("hasBloqueio");

/* ===== ADMIN MODE ===== */
if (sessionStorage.getItem("adminMode") === "true") {
    document.getElementById("adminUI").style.display = "block";
    sessionStorage.removeItem("adminMode");
    displayMembers();
    atualizarDependencias();
}

/* ===== LOAD SCALE ===== */
const escalaSalva = localStorage.getItem(chaveEscala);
if (escalaSalva) escreverNoHTML(JSON.parse(escalaSalva), mesAtual);

hasDependencia.addEventListener("change", () => {
    dependenciaSelect.disabled = !hasDependencia.checked;
});

hasBloqueio.addEventListener("change", () => {
    bloqueioSelect.disabled = !hasBloqueio.checked;
});


/* ===== ADD MEMBER ===== */
document.getElementById("addMemberForm").addEventListener("submit", e => {
    e.preventDefault();

    const name = memberName.value.trim();
    if (!name) {
        alert("Nome inválido");
        return;
    }

    if (
        membroEditandoIndex === null &&
        membros.some(m => m.name === name)
    ) {
        alert("Nome já existente");
        return;
    }

    const dados = {
        name,
        importance: parseInt(memberImportance.value),
        restrictions: [
            restSab.checked && "Sábado",
            restDom.checked && "Domingo",
            restQua.checked && "Quarta"
        ].filter(Boolean),
        carona: isCarona.checked,
        dependencia: hasDependencia.checked ? dependenciaSelect.value || null : null,
        bloqueio: hasBloqueio.checked ? bloqueioSelect.value || null : null,
        revezamento: revezamentoSelect.value || null
    };

    if (membroEditandoIndex !== null) {
        membros[membroEditandoIndex] = dados;
        membroEditandoIndex = null;
    } else {
        membros.push(dados);
    }

    localStorage.setItem(chaveMembros, JSON.stringify(membros));
    displayMembers();
    atualizarDependencias();
    e.target.reset();
});

/* ===== DISPLAY MEMBERS ===== */
function displayMembers() {
    memberList.innerHTML = "";

    membros.forEach((m, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            ${m.name}
            | Imp:${m.importance}
            | Carona:${m.carona || "Não"}
            | Dep:${m.dependencia || "Nenhuma"}
            | Bloq:${m.bloqueio || "Nenhum"}
            | Rev:${m.revezamento || "—"}
            <span class="editar" style="cursor:pointer;margin-left:10px" title="Editar">✏️</span>
            <span class="remover" style="cursor:pointer;color:red;margin-left:5px" title="Remover">🗑️</span>
        `;

        li.querySelector(".remover").onclick = () => {
            membros.splice(index, 1);
            localStorage.setItem(chaveMembros, JSON.stringify(membros));
            displayMembers();
            atualizarDependencias();
        };

        li.querySelector(".editar").onclick = () => editarMembro(index);

        memberList.appendChild(li);
    });
}


function atualizarDependencias() {
    dependenciaSelect.innerHTML = "<option value=''>Selecione</option>";
    bloqueioSelect.innerHTML = "<option value=''>Selecione</option>";

    membros.forEach(m => {
        const o1 = document.createElement("option");
        o1.value = m.name;
        o1.textContent = m.name;
        dependenciaSelect.appendChild(o1);

        const o2 = document.createElement("option");
        o2.value = m.name;
        o2.textContent = m.name;
        bloqueioSelect.appendChild(o2);
    });
}

function agruparPorRevezamento(membros) {
    const grupos = {};

    membros.forEach(m => {
        if (m.revezamento) {
            if (!grupos[m.revezamento]) {
                grupos[m.revezamento] = [];
            }
            grupos[m.revezamento].push(m);
        }
    });

    return grupos;
}

function escolherDoRevezamento(grupo, chave, estadoTemp) {
    // Busca o índice global. Se não existir, começa do 0.
    let ultimo = estadoTemp[chave] !== undefined ? estadoTemp[chave] : -1;
    
    // Calcula o próximo (ciclo entre os membros do grupo)
    const proximo = (ultimo + 1) % grupo.length;
    
    // Atualiza o estado global
    estadoTemp[chave] = proximo;
    
    return grupo[proximo];
}

function pesoComRevezamento(m) {
    const seq = sequenciaEscala[m.name] || 0;

    if (seq >= 2) return 0;           // 3º culto seguido → bloqueia
    if (seq === 1) return m.importance * 0.9; // 2º seguido → −10%

    return m.importance;
}

function editarMembro(index) {
    const m = membros[index];
    membroEditandoIndex = index;

    memberName.value = m.name;
    memberImportance.value = m.importance;

    restSab.checked = m.restrictions.includes("Sábado");
    restDom.checked = m.restrictions.includes("Domingo");
    restQua.checked = m.restrictions.includes("Quarta");

    isCarona.checked = m.carona;

    hasDependencia.checked = !!m.dependencia;
    dependenciaSelect.disabled = !hasDependencia.checked;
    dependenciaSelect.value = m.dependencia || "";

    hasBloqueio.checked = !!m.bloqueio;
    bloqueioSelect.disabled = !hasBloqueio.checked;
    bloqueioSelect.value = m.bloqueio || "";

    revezamentoSelect.value = m.revezamento || "";
}


/* ===== CLEAR SCALE ===== */
clearScale.onclick = () => {
    if (!confirm("Deseja apagar a escala deste mês?")) return;
    localStorage.removeItem(chaveEscala);
    resultado.innerHTML = "";
};

/* ===== GENERATE SCALE ===== */
generateScale.onclick = () => {
    localStorage.setItem(chaveMembros, JSON.stringify(membros));

    const escala = gerarEscala();
    localStorage.setItem(chaveEscala, JSON.stringify(escala));
    escreverNoHTML(escala, mesAtual);
};

function obterNomeDia(dia) {
    const data = new Date(anoAtual, mesAtual - 1, dia);

    const dias = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado"
    ];

    return dias[data.getDay()];
}

function gerarEscala() {
    const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
    const escala = [];
    const gruposRevezamento = agruparPorRevezamento(membros);

    // 1. Pegamos o estado REAL de onde parou a última geração definitiva
    let estadoReal = JSON.parse(localStorage.getItem(chaveRevezamento)) || {
        "SAB": -1, "DOM": -1, "QUA": -1 
    };

    // Criamos uma cópia para usar durante o loop deste mês
    let estadoLoop = { ...estadoReal };

    for (let d = 1; d <= ultimoDia; d++) {
        const diaNome = obterNomeDia(d);
        if (!diasUteis.includes(diaNome)) continue;

        const siglaDia = siglasDias[diaNome];
        const qtdNecessaria = membrosPorDia[diaNome];
        let nomesEscalados = [];

        // REVEZAMENTO CONTÍNUO
        if (gruposRevezamento[siglaDia] && gruposRevezamento[siglaDia].length > 0) {
            // Aqui a função escolherDoRevezamento vai pular para o próximo da fila
            const pessoa = escolherDoRevezamento(
                gruposRevezamento[siglaDia],
                siglaDia,
                estadoLoop
            );
            nomesEscalados.push(pessoa.name);
        }

        // ... resto da sua lógica de preenchimento (selecionarMembros) ...
        const disponiveis = membros.filter(m => 
            !nomesEscalados.includes(m.name) && 
            !m.restrictions.includes(diaNome) &&
            m.revezamento !== siglaDia
        );
        const ajudantes = selecionarMembros(disponiveis, qtdNecessaria - nomesEscalados.length, diaNome);
        ajudantes.forEach(a => nomesEscalados.push(a.name));

        escala.push({
            data: `${String(d).padStart(2,"0")}/${String(mesAtual).padStart(2,"0")}/${anoAtual}`,
            diaSemana: diaNome,
            nomes: nomesEscalados,
            hora: horasPorDia[diaNome]
        });
    }

    // IMPORTANTE: Só salvamos o estado final no localStorage 
    // se o usuário decidir que essa escala é a oficial.
    // Como você quer que o próximo mês continue, salvamos aqui:
    localStorage.setItem(chaveRevezamento, JSON.stringify(estadoLoop));

    return escala;
}
/* ===== SELECT MEMBERS ===== */
function selecionarMembros(lista, limite, diaNome) {
    const resultado = [];
    const usados = new Set();

    const siglaDia =
        diaNome === "Sábado" ? "SAB" :
        diaNome === "Domingo" ? "DOM" :
        diaNome === "Quarta" ? "QUA" : null;

    while (resultado.length < limite) {
        const candidatos = lista.filter(m => !usados.has(m.name));
        if (candidatos.length === 0) break;

        let pesos = candidatos.map(m => pesoComRevezamento(m));
        let total = pesos.reduce((a, b) => a + b, 0);

        if (total === 0) {
            pesos = candidatos.map(m => m.importance);
            total = pesos.reduce((a, b) => a + b, 0);
        }

        let r = Math.random() * total;
        let acumulado = 0;

        const escolhido = candidatos.find((m, i) => {
            acumulado += pesos[i];
            return acumulado >= r;
        });

        if (!escolhido) break;

        // BLOQUEIO
        const conflitoBloqueio = resultado.some(r =>
            r.bloqueio === escolhido.name ||
            escolhido.bloqueio === r.name
        );

        if (conflitoBloqueio) {
            usados.add(escolhido.name);
            continue;
        }

        // REVEZAMENTO POR DIA
        if (
            siglaDia &&
            escolhido.revezamento === siglaDia &&
            resultado.some(r => r.revezamento === siglaDia)
        ) {
            usados.add(escolhido.name);
            continue;
        }

        // DEPENDÊNCIA
        if (escolhido.dependencia) {
            const dep = lista.find(x => x.name === escolhido.dependencia);

            if (
                dep &&
                !usados.has(dep.name) &&
                resultado.length <= limite - 2 &&
                !resultado.some(r =>
                    r.bloqueio === dep.name ||
                    dep.bloqueio === r.name
                )
            ) {
                resultado.push(escolhido, dep);
                usados.add(escolhido.name);
                usados.add(dep.name);
            } else {
                usados.add(escolhido.name);
            }
        } else {
            resultado.push(escolhido);
            usados.add(escolhido.name);
        }
    }

    return resultado.slice(0, limite);
}


/* ===== HTML ===== */
function escreverNoHTML(dados, mes) {
    const mesesNomes = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const nomeMes = mesesNomes[mes - 1];
    const ano = new Date().getFullYear();
    const total = dados.length;
    const linhas = Math.ceil(total / 2);
    const esquerda = dados.slice(0, linhas);
    const direita = dados.slice(linhas);


    // Gera os itens (as duas colunas de datas e nomes)
    const itensHTML = esquerda.map((d, i) => {
    const d2 = direita[i];

    // Função interna para criar o HTML do bloco de forma idêntica
    const criarBloco = (dadosDia) => {
        if (!dadosDia) return `<div></div>`;
        return `
        <div class="item-escala">
            <div class="data-container">
                <div class="data-box"><p>${dadosDia.data.split('/')[0]}</p></div>
                <div class="sigla-dia"><p>${siglasDias[dadosDia.diaSemana] || "---"}</p></div>
            </div>
            <div class="nomes-box">
                <p class="nomes-escala" 
                   data-index="${dadosDia.originalIndex}" 
                   ${isAdmin ? 'contenteditable="true"' : ''}>
                    ${dadosDia.nomes.join(", ")}
                </p>
            </div>
        </div>`;
    };

    return criarBloco(d) + criarBloco(d2);
}).join("");



    // Insere no elemento #resultado
    document.getElementById("resultado").innerHTML = `
    <div class="escala-container-wrapper">
        <div class="background-escala" id="escala-final">
            <div class="header-escala">
                <div>
                    <h1 style="font-family: 'Anton', sans-serif; -webkit-text-stroke: 0.15px #091d71; color: white; font-size: 158px; line-height: 0.9;">SONOPLASTIA</h1>
                    <h1 style="font-family: 'Glacial Indifference', sans-serif; color: white; font-size: 38.2px; text-align: right; letter-spacing: 4px;">
                        ESCALA | ${nomeMes} | ${ano}
                    </h1>    
                </div>
                <div style="background-color: white; width: 11.9px; height: 302.6px; margin-left: 80px;"></div>
                <img src="imagens/logoredondo.png" alt="Logo" style="width: 302.6px; height: 302.6px; margin-left: 40px;">
            </div>

            <div class="grid-escala">
                ${itensHTML}
            </div>
        </div>
    </div>`;
}


/* ===== EDIÇÃO DINÂMICA (Dentro do escopo principal) ===== */
document.getElementById("resultado").addEventListener("blur", (e) => {
        if (e.target.classList.contains("nomes-escala") && sessionStorage.getItem("adminMode") === "true") {
            const texto = e.target.innerText.trim();
            const itemPai = e.target.closest(".item-escala");
            if (!itemPai) return;

            const dataBox = itemPai.querySelector(".data-box p");
            const diaTexto = dataBox.innerText.padStart(2, '0');
            
            // Agora ele consegue ler a chaveEscala porque está no mesmo escopo
            let escala = JSON.parse(localStorage.getItem(chaveEscala));
            if (!escala) return;

            const indexNaEscala = escala.findIndex(item => item.data.startsWith(diaTexto));
            
            if (indexNaEscala !== -1) {
                escala[indexNaEscala].nomes = texto.split(",").map(n => n.trim());
                localStorage.setItem(chaveEscala, JSON.stringify(escala));
                console.log(`Alteração salva para o dia ${diaTexto}`);
            }
        }
    }, true);

/* ===== ADMIN COMMAND ===== */
window.AdminSono = () => {
    sessionStorage.setItem("adminMode","true");
    location.reload();
};

if (isAdmin) {
    document.querySelectorAll(".nomes-escala").forEach((el, index) => {
        el.addEventListener("blur", () => {
            const texto = el.innerText.trim();

            const escala = JSON.parse(localStorage.getItem(chaveEscala));
            if (!escala || !escala[index]) return;

            escala[index].nomes = texto.split(",").map(n => n.trim());
            localStorage.setItem(chaveEscala, JSON.stringify(escala));
        });
    });
} 

})();// O 'true' é vital para capturar o evento 'blur' que não borbulha normalmente // O 'true' captura o evento de desfoque (blur)

/* ===== PNG ===== */
function baixarPNG() {
    const escala = document.getElementById("escala-final");

    if (!escala) {
        alert("Escala não encontrada");
        return;
    }

    // Remove o zoom
    escala.classList.add("sem-zoom");

    setTimeout(() => {
        html2canvas(escala, {
            scale: 1,
            useCORS: true,
            backgroundColor: null
        }).then(canvas => {
            const link = document.createElement("a");
            link.download = "escala_sonoplastia.png";
            link.href = canvas.toDataURL("image/png");
            link.click();

            // Restaura o zoom
            escala.classList.remove("sem-zoom");
        });
    }, 50);
}
