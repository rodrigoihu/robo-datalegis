// ==UserScript==
// @name         Robô Datalegis - Sincronização Automática Contínua (Versão 14.4)
// @namespace    http://tampermonkey.net/
// @version      14.4
// @description  Data real do ato no título da ANVISA, layout responsivo anti-esmagamento, auto-sync com Google Sheets e LinkTexto
// @match        http://manutencao.datalegis.inf.br/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      in.gov.br
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURAÇÃO DA PLANILHA GOOGLE
    // =========================================================================
    const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwPynoJkXtcJB3XUdFeNRll0bT6z8Xf7yEWA3IgQoXlBGKCDgOwv07mGVC4K8sOnLZnaw/exec";

    // =========================================================================
    // 1. INJEÇÃO ATIVA DA FUNÇÃO LINKTEXTO
    // =========================================================================
    function registrarLinkTextoGlobal() {
        const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        
        win.LinkTexto = function(tipo, num, seq, ano, orgao, dispTipo, dispNum, extra) {
            const baseUrl = window.location.origin;
            const pTipo = tipo || '';
            const pNum = num || '';
            const pSeq = seq || '000';
            const pAno = ano || '';
            const pOrgao = orgao || 'NI';
            const pDispTipo = dispTipo || '';
            const pDispNum = dispNum || '';

            const url = `${baseUrl}/action/ActionDatalegis.php?acao=abrirTextoAto&link=S&tipo=${pTipo}&num=${pNum}&seq=${pSeq}&ano=${pAno}&orgao=${encodeURIComponent(pOrgao)}&disptipo=${pDispTipo}&dispnum=${pDispNum}`;
            window.open(url, 'AtoDatalegis', 'width=1100,height=750,scrollbars=yes,resizable=yes');
        };

        document.querySelectorAll('iframe').forEach(ifr => {
            try {
                if (ifr.contentWindow) {
                    ifr.contentWindow.LinkTexto = win.LinkTexto;
                }
            } catch(e) {}
        });
    }

    registrarLinkTextoGlobal();
    setInterval(registrarLinkTextoGlobal, 2000);

    // =========================================================================
    // 2. DICIONÁRIO BASE LOCAL & SINCRONIZAÇÃO EM NUVEM
    // =========================================================================
    let DICIONARIO_SIGLAS = {
        "MINISTÉRIO DA AGRICULTURA E PECUÁRIA": "MAPA",
        "MINISTÉRIO DA AGRICULTURA": "MAPA",
        "MINISTÉRIO DE MINAS E ENERGIA": "MME",
        "MINISTÉRIO DA EDUCAÇÃO": "MEC",
        "MINISTÉRIO DA SAÚDE": "MS",
        "MINISTÉRIO DA FAZENDA": "MF",
        "MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA": "MJSP",
        "MINISTÉRIO DA JUSTIÇA": "MJSP",
        "MINISTÉRIO DO MEIO AMBIENTE E MUDANÇA DO CLIMA": "MMA",
        "MINISTÉRIO DO MEIO AMBIENTE": "MMA",
        "MINISTÉRIO DA PESCA E AQUICULTURA": "MPA",
        "MINISTÉRIO DO PLANEJAMENTO E ORÇAMENTO": "MPO",
        "MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS": "MGI",
        "MINISTÉRIO DO DESENVOLVIMENTO, INDÚSTRIA, COMÉRCIO E SERVIÇOS": "MDIC",
        "MINISTÉRIO DAS COMUNICAÇÕES": "MCOM",
        "MINISTÉRIO DA CIÊNCIA, TECNOLOGIA E INOVAÇÃO": "MCTI",
        "MINISTÉRIO DA CULTURA": "MINC",
        "MINISTÉRIO DOS TRANSPORTES": "MT",
        "MINISTÉRIO DAS CIDADES": "MCID",
        "MINISTÉRIO DO TRABALHO E EMPREGO": "MTE",
        "MINISTÉRIO DA PREVIDÊNCIA SOCIAL": "MPS",
        "MINISTÉRIO DOS DIREITOS HUMANOS E DA CIDADANIA": "MDHC",
        "MINISTÉRIO DO DESENVOLVIMENTO AGRÁRIO E AGRICULTURA FAMILIAR": "MDA",
        "MINISTÉRIO DA DEFESA": "MD",
        "MINISTÉRIO DO ESPORTE": "ME",
        "MINISTÉRIO DOS POVOS INDÍGENAS": "MPI",
        "MINISTÉRIO DAS MULHERES": "MMULHERES",
        "MINISTÉRIO DO TURISMO": "MTUR",
        "MINISTÉRIO DE PORTOS E AEROPORTOS": "MPOR",
        "MINISTÉRIO DA INTEGRAÇÃO E DO DESENVOLVIMENTO REGIONAL": "MIDR",
        "CASA CIVIL DA PRESIDÊNCIA DA REPÚBLICA": "CC",
        "SECRETARIA-GERAL DA PRESIDÊNCIA DA REPÚBLICA": "SGPR",
        "CONTROLADORIA-GERAL DA UNIÃO": "CGU",
        "ADVOCACIA-GERAL DA UNIÃO": "AGU",

        "AGÊNCIA NACIONAL DE SAÚDE SUPLEMENTAR": "ANS",
        "AGÊNCIA NACIONAL DE SAÚDE": "ANS",
        "ANS": "ANS",

        "AGÊNCIA NACIONAL DO PETRÓLEO, GÁS NATURAL E BIOCOMBUSTÍVEIS": "ANP",
        "AGÊNCIA NACIONAL DO PETRÓLEO": "ANP",
        "AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA": "ANVISA",
        "AGÊNCIA NACIONAL DE ÁGUAS E SANEAMENTO BÁSICO": "ANA",
        "AGÊNCIA NACIONAL DE TRANSPORTES TERRESTRES": "ANTT",
        "AGÊNCIA NACIONAL DE ENERGIA ELÉTRICA": "ANEEL",
        "AGÊNCIA NACIONAL DE TELECOMUNICAÇÕES": "ANATEL",
        "AGÊNCIA NACIONAL DE MINERAÇÃO": "ANM",
        "AGÊNCIA NACIONAL DE AVIAÇÃO CIVIL": "ANAC",
        "AGÊNCIA NACIONAL DE TRANSPORTES AQUAVIÁRIOS": "ANTAQ",
        "AGÊNCIA NACIONAL DO CINEMA": "ANCINE",
        "INSTITUTO NACIONAL DO SEGURO SOCIAL": "INSS",
        "INSTITUTO BRASILEIRO DO MEIO AMBIENTE E DOS RECURSOS NATURAIS RENOVÁVEIS": "IBAMA",
        "INSTITUTO CHICO MENDES DE CONSERVAÇÃO DA BIODIVERSIDADE": "ICMBIO",
        "INSTITUTO NACIONAL DE METROLOGIA, QUALIDADE E TECNOLOGIA": "INMETRO",
        "INSTITUTO NACIONAL DE ESTUDOS E PESQUISAS EDUCACIONAIS ANÍSIO TEIXEIRA": "INEP",

        "DIRETORIA COLEGIADA": "DC",
        "SECRETARIA EXECUTIVA": "SE",
        "GABINETE DO MINISTRO": "GM",
        "CONSELHO DE ADMINISTRAÇÃO": "CA",
        "CORREGEDORIA": "CRG"
    };

    function sincronizarDicionarioNuvem(callback) {
        if (!GOOGLE_SHEETS_WEBAPP_URL) {
            if (callback) callback();
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: GOOGLE_SHEETS_WEBAPP_URL,
            onload: function(res) {
                try {
                    const dictNuvem = JSON.parse(res.responseText);
                    for (let chave in dictNuvem) {
                        DICIONARIO_SIGLAS[chave.toUpperCase().trim()] = dictNuvem[chave].toUpperCase().trim();
                    }
                } catch(e) {}
                if (callback) callback();
            },
            onerror: function() {
                if (callback) callback();
            }
        });
    }

    function salvarNovoOrgaoNaPlanilha(nomeDOU, siglaFinal, callback) {
        if (!GOOGLE_SHEETS_WEBAPP_URL) {
            alert("⚠️ Configure a URL do Google Apps Script.");
            if (callback) callback(false);
            return;
        }
        if (!nomeDOU || !siglaFinal) {
            alert("⚠️ Preencha tanto o Nome no DOU quanto a Sigla Datalegis.");
            if (callback) callback(false);
            return;
        }

        const nomeLimpo = nomeDOU.trim().toUpperCase();
        const siglaLimpa = siglaFinal.trim().toUpperCase();

        DICIONARIO_SIGLAS[nomeLimpo] = siglaLimpa;

        GM_xmlhttpRequest({
            method: 'POST',
            url: GOOGLE_SHEETS_WEBAPP_URL,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ nome: nomeLimpo, sigla: siglaLimpa }),
            onload: function() {
                if (callback) callback(true);
            },
            onerror: function() {
                if (callback) callback(false);
            }
        });
    }

    sincronizarDicionarioNuvem();

    // =========================================================================
    // 3. MOTOR DE RESOLUÇÃO DE ÓRGÃOS & EXTRAÇÃO DE DATAS
    // =========================================================================
    function extrairDataDoAto(titulo, corpo, dataFallback) {
        const MESES = {
            'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'MARCO': '03', 'ABRIL': '04',
            'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08', 'SETEMBRO': '09',
            'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
        };

        // 1. Extração prioritária do Título (ex: DE 26 DE AGOSTO DE 2026)
        const matchTitExt = (titulo || "").match(/(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)\s+DE\s+(\d{4})/i);
        if (matchTitExt) {
            const mesUpper = matchTitExt[2].toUpperCase().trim();
            if (MESES[mesUpper]) {
                return `${String(matchTitExt[1]).padStart(2, '0')}/${MESES[mesUpper]}/${matchTitExt[3]}`;
            }
        }

        const matchTitNum = (titulo || "").match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (matchTitNum) {
            return `${String(matchTitNum[1]).padStart(2, '0')}/${String(matchTitNum[2]).padStart(2, '0')}/${matchTitNum[3]}`;
        }

        // 2. Extração secundária do preâmbulo/corpo do ato
        const matchCorpoExt = (corpo || "").match(/(?:em|de)\s+(\d{1,2})\s+de\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)\s+de\s+(\d{4})/i);
        if (matchCorpoExt) {
            const mesUpper = matchCorpoExt[2].toUpperCase().trim();
            if (MESES[mesUpper]) {
                return `${String(matchCorpoExt[1]).padStart(2, '0')}/${MESES[mesUpper]}/${matchCorpoExt[3]}`;
            }
        }

        return dataFallback || "";
    }

    function gerarSiglaHeuristica(nome) {
        if (!nome) return "";
        const stopwords = new Set([
            "DE", "DA", "DO", "DAS", "DOS", "E", "EM", "A", "O", "AS", "OS", 
            "AO", "AOS", "PARA", "COM", "POR", "NO", "NA", "NOS", "NAS", "D", "À", "ÀS"
        ]);
        const limpo = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s\-]/gi, " ");
        const palavras = limpo.trim().split(/\s+/).filter(w => w.length > 0 && !stopwords.has(w.toUpperCase()));
        
        if (palavras.length === 0) return "";
        if (palavras.length === 1 && palavras[0].length <= 6) return palavras[0].toUpperCase();
        
        return palavras.map(p => p[0].toUpperCase()).join("");
    }

    function resolverSiglaOrgao(titulo, orgaoRaw, tipoAto) {
        const matchSiglaTitulo = (titulo || "").match(/(?:PORTARIA|INSTRUÇÃO NORMATIVA|DESPACHO|RESOLUÇÃO|DECISÃO|ACÓRDÃO|EDITAL|AVISO)\s+(?:CONJUNTA\s+|INTERMINISTERIAL\s+|NORMATIVA\s+)?([A-Z0-9\-_]+(?:\/[A-Z0-9\-_]+)+)\s+N[ºo°\.]/i);
        if (matchSiglaTitulo) {
            let siglaExtraida = matchSiglaTitulo[1].toUpperCase().trim();
            if (siglaExtraida.includes("ANS") && !siglaExtraida.includes("MS")) siglaExtraida += "/MS";
            if ((tipoAto === "RDC" || (titulo || "").toUpperCase().includes("RDC")) && siglaExtraida.includes("ANVISA") && !siglaExtraida.startsWith("RDC/")) {
                siglaExtraida = "RDC/" + siglaExtraida;
            }
            return siglaExtraida;
        }

        if (!orgaoRaw) return "";
        const orgaoCruUpper = orgaoRaw.trim().toUpperCase();

        if (DICIONARIO_SIGLAS[orgaoCruUpper]) {
            return DICIONARIO_SIGLAS[orgaoCruUpper];
        }

        const partes = orgaoRaw.split(/\s*\/\s*|\n+/).map(p => p.trim()).filter(Boolean);
        let siglas = [];

        for (let i = 0; i < partes.length; i++) {
            const pUpper = partes[i].toUpperCase();
            let siglaAchada = "";

            if (DICIONARIO_SIGLAS[pUpper]) {
                siglaAchada = DICIONARIO_SIGLAS[pUpper];
            } else {
                for (let chave in DICIONARIO_SIGLAS) {
                    if (pUpper === chave || pUpper.includes(chave)) {
                        siglaAchada = DICIONARIO_SIGLAS[chave];
                        break;
                    }
                }
            }

            if (!siglaAchada && pUpper.includes("SUPERINTENDÊNCIA") && pUpper.includes("AGRICULTURA")) {
                const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
                for (let u = 0; u < ufs.length; u++) {
                    const uf = ufs[u];
                    if (pUpper.endsWith(" " + uf) || pUpper.includes(" " + uf + " ") || pUpper.includes("ESTADO D" + " " + uf) || (pUpper.includes("BAHIA") && uf === "BA") || (pUpper.includes("MINAS GERAIS") && uf === "MG")) {
                        siglaAchada = "SFA-" + uf;
                        break;
                    }
                }
                if (!siglaAchada) siglaAchada = "SFA";
            }

            if (!siglaAchada) {
                siglaAchada = gerarSiglaHeuristica(partes[i]);
            }

            if (siglaAchada && !siglas.includes(siglaAchada)) {
                siglas.push(siglaAchada);
            }
        }

        if (siglas.includes("ANS") && !siglas.includes("MS")) {
            siglas.push("MS");
        }

        if (siglas.length === 0) return "";

        let siglaFinal = "";
        if (siglas.length > 1) {
            const nivelSuperior = siglas[0];
            const subunidades = siglas.slice(1).reverse();
            siglaFinal = subunidades.concat(nivelSuperior).join('/');
        } else {
            siglaFinal = siglas[0];
        }

        if ((tipoAto === "RDC" || (titulo || "").toUpperCase().includes("RDC")) && siglaFinal.includes("ANVISA")) {
            if (!siglaFinal.startsWith("RDC/")) {
                siglaFinal = "RDC/" + siglaFinal;
            }
        }

        return siglaFinal;
    }

    // =========================================================================
    // 4. CLASSIFICADOR DE TIPOS DE ATO
    // =========================================================================
    function classificarTipoAto(titulo, texto) {
        const t = (titulo || "").toUpperCase().trim();
        const b = (texto || "").toUpperCase();

        if (t.includes("PORTARIA CONJUNTA")) return "PCJ";
        if (t.includes("PORTARIA INTERMINISTERIAL")) return "PIM";
        if (t.includes("PORTARIA NORMATIVA")) return "PNT";
        if (t.startsWith("PORTARIA") || t.includes("PORTARIA ")) {
            if (b.includes("NOMEAR") || b.includes("NOMEAÇÃO")) return "NOM";
            if (b.includes("EXONERAR") || b.includes("EXONERAÇÃO")) return "EXO";
            if (b.includes("DESIGNAR") || b.includes("DESIGNAÇÃO")) return "DES";
            if (b.includes("DISPENSAR") || b.includes("DISPENSA")) return "DIS";
            if (b.includes("APOSENTADORIA")) return "APO";
            return "POR";
        }

        if (t.startsWith("DESPACHO") || t.includes("DESPACHO ")) return "DEP";
        if (t.includes("INSTRUÇÃO NORMATIVA CONJUNTA")) return "INC";
        if (t.includes("INSTRUÇÃO NORMATIVA INTERMINISTERIAL")) return "INI";
        if (t.includes("INSTRUÇÃO NORMATIVA")) return "INM";

        if (t.includes("DIRETORIA COLEGIADA") || t.includes("RDC")) return "RDC";
        if (t.includes("RESOLUÇÃO REGIMENTAL") || t.includes("RRG")) return "RRG";
        if (t.includes("RESOLUÇÃO NORMATIVA") || t.includes("RN ")) return "REN";
        if (t.includes("RESOLUÇÃO CONJUNTA")) return "RSC";
        if (t.includes("RESOLUÇÃO ADMINISTRATIVA")) return "RAM";
        if (t.includes("RESOLUÇÃO")) return "RES";

        if (t.includes("DECRETO-LEI") || t.includes("DECRETO LEI") || t.startsWith("DEL ")) return "DEL";
        if (t.includes("DECRETO LEGISLATIVO") || t.includes("DECRETO-LEGISLATIVO") || t.startsWith("DLG ")) return "DLG";
        if (t.includes("DECRETO") || t.startsWith("DEC ")) return "DEC";

        if (t.includes("LEI COMPLEMENTAR")) return "LCP";
        if (t.includes("LEI")) return "LEI";
        if (t.includes("MEDIDA PROVISÓRIA") || t.includes("MEDIDA PROVISORIA")) return "MPV";

        if (t.includes("CESSÃO DE USO") || t.includes("CONTRATO DE CESSÃO")) return "CES";
        if (t.includes("TERMO ADITIVO") || t.includes("EXTRATO DE ADITIVO")) return "ETA";
        if (t.includes("APOSTILAMENTO") || t.includes("TERMO DE APOSTILAMENTO")) return "EXL";
        if (t.includes("DISTRATO") || t.includes("TERMO DE DISTRATO")) return "EXD";
        if (t.includes("EXECUÇÃO DESCENTRALIZADA") || t.includes("TED")) return "TED";
        if (t.includes("TERMO DE FOMENTO")) return "ETF";
        if (t.includes("TERMO DE COLABORAÇÃO")) return "TCL";
        if (t.includes("TERMO DE COMPROMISSO")) return "TCM";
        if (t.includes("TERMO DE ADESÃO")) return "ETE";
        if (t.includes("TERMO DE AJUSTAMENTO DE CONDUTA") || t.includes(" TAC ")) return "ETJ";
        if (t.includes("DOAÇÃO") || t.includes("EXTRATO DE DOAÇÃO")) return "DOA";
        if (t.includes("COOPERAÇÃO") || t.includes("ACORDO DE COOPERAÇÃO")) return "ECO";
        if (t.includes("CONVÊNIO")) return "COV";
        if (t.includes("COMODATO")) return "ECM";
        if (t.includes("CREDENCIAMENTO")) return "ECE";
        if (t.includes("DESFAZIMENTO DE BENS")) return "DEF";

        if (t.includes("DISPENSA DE LICITAÇÃO")) return "EDL";
        if (t.includes("INEXIGIBILIDADE DE LICITAÇÃO")) return "IXL";
        if (t.includes("REGISTRO DE PREÇOS")) return "ERP";
        if (t.includes("PREGÃO ELETRÔNICO") || t.includes("PREGÃO")) return "PRG";
        if (t.includes("TOMADA DE PREÇO")) return "TPR";
        if (t.includes("CONCORRÊNCIA")) return "COR";
        if (t.includes("LEILÃO")) return "LEL";
        if (t.includes("AVISO DE LICITAÇÃO") || t.includes("AVISO")) return "AVS";
        if (t.includes("EDITAL")) return "EDT";

        if (t.includes("EXTRATO DE CONTRATO") || t.includes("TERMO DE CONTRATO")) return "EXC";
        if (t.includes("DECISÃO")) return "DCS";
        if (t.includes("ACÓRDÃO")) return "ACO";
        if (t.includes("ATA")) return "ATA";
        if (t.includes("PARECER")) return "PAR";
        if (t.includes("COMUNICADO")) return "COM";

        return "";
    }

    function classificarSituacaoAto(ementa, textoCorpo, dataDOU) {
        const em = (ementa || "").toUpperCase();
        const corpo = (textoCorpo || "").toUpperCase();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const MESES = {
            'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'MARCO': 2, 'ABRIL': 3,
            'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7, 'SETEMBRO': 8,
            'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
        };

        const matchDataExtenso = corpo.match(/(?:entra\s+em\s+vigor|produz(?:indo)?\s+efeitos)\s+(?:a\s+partir\s+de\s+|em\s+|no\s+dia\s+)?(\d{1,2})\s+de\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)\s+de\s+(\d{4})/i);
        if (matchDataExtenso) {
            const dia = parseInt(matchDataExtenso[1], 10);
            const mesNome = matchDataExtenso[2].toUpperCase().trim();
            const ano = parseInt(matchDataExtenso[3], 10);
            if (MESES[mesNome] !== undefined) {
                const dtVigor = new Date(ano, MESES[mesNome], dia);
                if (dtVigor > hoje) return "À Entrar em Vigor";
            }
        }

        const matchDataNum = corpo.match(/(?:entra\s+em\s+vigor|produz(?:indo)?\s+efeitos)\s+(?:a\s+partir\s+de\s+|em\s+|no\s+dia\s+)?(\d{2})\/(\d{2})\/(\d{4})/i);
        if (matchDataNum) {
            const dtVigor = new Date(parseInt(matchDataNum[3], 10), parseInt(matchDataNum[2], 10) - 1, parseInt(matchDataNum[1], 10));
            if (dtVigor > hoje) return "À Entrar em Vigor";
        }

        const matchDias = corpo.match(/entra\s+em\s+vigor\s+(?:após|decorridos)\s+(\d+)\s+dias/i);
        if (matchDias && dataDOU) {
            const partesD = dataDOU.split('/');
            if (partesD.length === 3) {
                const dtPub = new Date(parseInt(partesD[2], 10), parseInt(partesD[1], 10) - 1, parseInt(partesD[0], 10));
                dtPub.setDate(dtPub.getDate() + parseInt(matchDias[1], 10));
                if (dtPub > hoje) return "À Entrar em Vigor";
            }
        }

        const isEmentaAltera = /\bALTERA\b|\bALTERAR\b|\bDÁ NOVA REDAÇÃO\b|\bACRESCE\b|\bACRESCENTA\b|\bMODIFICA\b/i.test(em);
        const isCorpoAltera = /PASSA A VIGORAR COM A(?: SEGUINTE)? REDAÇÃO|ACRESCENTA O ARTIGO|FICA(?:M)? ALTERADO/i.test(corpo);
        const temAlteracao = isEmentaAltera || isCorpoAltera;

        const isEmentaRevoga = /\bREVOGA\b|\bREVOGAR\b/i.test(em);
        const isCorpoRevoga = /FICA(?:M)? REVOGADO|REVOGAM-SE|REVOGA-SE/i.test(corpo);
        const temRevogacao = isEmentaRevoga || isCorpoRevoga;

        if (temAlteracao) return "Alterador";
        if (temRevogacao && !temAlteracao) return "Revogador";

        return "Vigente";
    }

    function sugerirEmentaHeuristica(textoCorpo, titulo) {
        if (!textoCorpo) return "";
        const linhas = textoCorpo.split(/\n+/).map(l => l.trim()).filter(Boolean);

        let alvo = "";
        for (let i = 0; i < linhas.length; i++) {
            const l = linhas[i];
            if (/^(?:Art\.\s*1[ºo°\.]?|Resolve:?|Fica|O\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+resolve)/i.test(l)) {
                alvo = l.replace(/^Art\.\s*1[ºo°\.]?\s*/i, '').replace(/^Resolve:?\s*/i, '').trim();
                break;
            }
        }

        if (!alvo && linhas.length > 0) {
            alvo = linhas[0];
        }

        if (!alvo) return "";

        const conversoes = [
            [/^Instaurar\b/i, "Instaura"],
            [/^Autorizar\b/i, "Autoriza"],
            [/^Designar\b/i, "Designa"],
            [/^Dispensar\b/i, "Dispensa"],
            [/^Exonerar\b/i, "Exonera"],
            [/^Nomear\b/i, "Nomeia"],
            [/^Conceder\b/i, "Concede"],
            [/^Homologar\b/i, "Homologa"],
            [/^Credenciar\b/i, "Credencia"],
            [/^Prorrogar\b/i, "Prorroga"],
            [/^Aprovar\b/i, "Aprova"],
            [/^Instituir\b/i, "Institui"],
            [/^Estabelecer\b/i, "Estabelece"],
            [/^Tornar\s+sem\s+efeito\b/i, "Torna sem efeito"],
            [/^Declarar\b/i, "Declara"],
            [/^Revogar\b/i, "Revoga"],
            [/^Alterar\b/i, "Altera"],
            [/^Reconhecer\b/i, "Reconhece"],
            [/^Fixar\b/i, "Fixa"],
            [/^Dispor\b/i, "Dispõe"],
            [/^Determinar\b/i, "Determina"],
            [/^Habilitar\b/i, "Habilita"],
            [/^Delegar\b/i, "Delega"],
            [/^Definir\b/i, "Define"],
            [/^Substituir\b/i, "Substitui"],
            [/^Aplicar\b/i, "Aplica"],
            [/^Retificar\b/i, "Retifica"],
            [/^Divulgar\b/i, "Divulga"],
            [/^Constituir\b/i, "Constitui"],
            [/^Cancelar\b/i, "Cancela"],
            [/^Suspender\b/i, "Suspende"],
            [/^Reajustar\b/i, "Reajusta"],
            [/^Atualizar\b/i, "Atualiza"]
        ];

        for (let j = 0; j < conversoes.length; j++) {
            const [regex, substituicao] = conversoes[j];
            if (regex.test(alvo)) {
                alvo = alvo.replace(regex, substituicao);
                break;
            }
        }

        alvo = alvo.replace(/,\s*conforme\s+consta\s+do\s+Processo.*$/i, '.');
        alvo = alvo.replace(/,\s*tendo\s+em\s+vista.*$/i, '.');
        if (!alvo.endsWith('.')) alvo += '.';

        return alvo;
    }

    function isSubtituloCurto(texto) {
        if (!texto) return false;
        const limpo = texto.trim();
        const isUpper = limpo === limpo.toUpperCase() && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(limpo);
        const semPontoFinal = !limpo.endsWith('.');
        const tamanhoCurto = limpo.length <= 65;
        const padraoAto = /^(CONTRATO|EXTRATO|TERMO|PORTARIA|EDITAL|AVISO|ACORDO|CONV[EÊ]NIO|DOA[CÇ][AÃ]O|APOSTILAMENTO|CESS[AÃ]O|DESPACHO|ANEXO)/i.test(limpo);
        const naoMeta = !limpo.startsWith("ESPÉCIE") && !limpo.startsWith("OBJETO") && !limpo.startsWith("PROCESSO") && !limpo.startsWith("VALOR");
        return isUpper && semPontoFinal && tamanhoCurto && padraoAto && naoMeta;
    }

    function extrairNumeroEAno(titulo, textoCorpo, dataDOU, anoDOU) {
        let numAto = "";
        let anoAto = anoDOU;

        const matchTitulo = titulo.match(/(?:N[ºo°\.]\s*|NÚMERO\s+|N[ºo°\.]\s*:\s*)([\d\.]+)(?:[\/\-](\d{2,4}))?/i);
        if (matchTitulo) {
            numAto = matchTitulo[1].replace(/\./g, '').trim();
            if (matchTitulo[2]) {
                anoAto = matchTitulo[2].length === 2 ? ("20" + matchTitulo[2]) : matchTitulo[2];
            }
            return { numAto, anoAto };
        }

        const textoSemCitacoes = textoCorpo.replace(/(?:Lei|Decreto(?:-Lei)?|Edital|Processo|Parecer|Acórdão|Portaria|Resolução|Instrução\s+Normativa)\s*(?:n[ºo°\.]\s*|n\.\s*|número\s*)?[\d\.\/\-]+/gi, ' [REF] ');

        const matchCorpo = textoSemCitacoes.match(/(?:N[úu]mero\s*(?:do\s+Contrato|do\s+Ato|do\s+Termo|do\s+Despacho)?\s*:\s*|Despacho\s+n[ºo°\.]\s*|Contrato\s+n[ºo°\.]\s*|Termo\s+Aditivo\s+n[ºo°\.]\s*)([\d\.]+)(?:[\/\-](\d{2,4}))?/i)
                        || textoSemCitacoes.match(/(?:N[ºo°\.]\s*|NÚMERO\s+)([\d\.]+)(?:[\/\-](\d{2,4}))?/i)
                        || textoSemCitacoes.match(/([\d\.]+)[\/\-](\d{4})/);

        if (matchCorpo) {
            numAto = matchCorpo[1].replace(/\./g, '').trim();
            if (matchCorpo[2]) {
                anoAto = matchCorpo[2].length === 2 ? ("20" + matchCorpo[2]) : matchCorpo[2];
            }
            return { numAto, anoAto };
        }

        const matchData = dataDOU.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (matchData) {
            numAto = `${matchData[1]}${matchData[2]}${matchData[3]}`;
            anoAto = matchData[3];
        }

        return { numAto, anoAto };
    }

    function extrairNomeTipoAto(titulo) {
        const t = (titulo || "").trim();
        const m = t.match(/^(Portaria(?:\s+Conjunta|\s+Normativa|\s+Interministerial)?|Resolu[çc][ãa]o(?:\s+da\s+Diretoria\s+Colegiada|\s+Normativa|\s+Regimental|\s+Conjunta)?|Instru[çc][ãa]o\s+Normativa|Despacho|Decis[ãa]o|Decreto(?:-Lei|\s+Lei)?|Lei(?:\s+Complementar)?|Medida\s+Provis[óo]ria|Edital|Aviso|Ac[óo]rd[ãa]o|Ata|Parecer|Consulta\s+P[úu]blica|Retifica[çc][ãa]o|Delibera[çc][ãa]o|Autoriza[çc][ãa]o|Alvar[áa]|Termo\s+Aditivo|Extrato)/i);
        if (m) {
            const raw = m[1];
            return raw.charAt(0).toUpperCase() + raw.slice(1);
        }
        return "Outros";
    }

    // =========================================================================
    // 5. MOTOR DE AUTO-LINKER
    // =========================================================================
    function formatarLinkTextoTag(tipo, numBruto, anoBruto, orgaoDefault, textoCompleto) {
        if (!numBruto || !anoBruto) return textoCompleto;
        const numDigitos = numBruto.replace(/\D/g, '');
        if (!numDigitos) return textoCompleto;

        const num8 = String(numDigitos).padStart(8, '0');
        let ano = String(anoBruto).trim();
        if (ano.length === 2) {
            ano = parseInt(ano, 10) > 40 ? ('19' + ano) : ('20' + ano);
        }
        if (ano.length !== 4) return textoCompleto;

        const orgao = orgaoDefault || 'NI';
        const link = `javascript:LinkTexto('${tipo}','${num8}','000','${ano}','${orgao}','','','')`;
        return `<a href="${link}">${textoCompleto}</a>`;
    }

    function aplicarLinksNoTexto(htmlCorpo, siglaOrgaoContexto) {
        if (!htmlCorpo) return "";

        const partes = htmlCorpo.split(/(<[^>]+>)/g);

        for (let p = 0; p < partes.length; p++) {
            if (partes[p].startsWith('<')) continue;

            let txt = partes[p];

            // 1. RDC Anvisa
            txt = txt.replace(/\b(?:Resolu[çc][ãa]o(?:\s+da\s+Diretoria\s+Colegiada)?\s*-\s*RDC|Resolu[çc][ãa]o\s+da\s+Diretoria\s+Colegiada|RDC)\s+(?:Anvisa\s+)?(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('RDC', num, ano1 || ano2, 'RDC/DC/ANVISA/MS', match);
            });

            // 2. Resolução Regimental (RRG)
            txt = txt.replace(/\b(?:Resolu[çc][ãa]o\s+Regimental|RRG)\s+(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('RRG', num, ano1 || ano2, 'NI', match);
            });

            // 3. Resolução Normativa (REN)
            txt = txt.replace(/\b(?:Resolu[çc][ãa]o\s+Normativa|REN|RN)\s+(?:(Anvisa|ANS|Aneel|Anatel)\s+)?(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, orgTag, num, ano1, ano2) {
                let org = 'NI';
                if (orgTag) {
                    const o = orgTag.toUpperCase();
                    if (o === 'ANS') org = 'ANS/MS';
                    else if (o === 'ANVISA') org = 'ANVISA/MS';
                }
                return formatarLinkTextoTag('REN', num, ano1 || ano2, org, match);
            });

            // 4. Lei Complementar (LCP)
            txt = txt.replace(/\b(?:Lei\s+Complementar|LCP)\s+(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('LCP', num, ano1 || ano2, 'NI', match);
            });

            // 5. Decreto-Lei (DEL)
            txt = txt.replace(/\b(?:Decreto-Lei|Decreto\s+Lei|DEL)\s+(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('DEL', num, ano1 || ano2, 'NI', match);
            });

            // 6. Lei Ordinária (LEI)
            txt = txt.replace(/\bLei\s+(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('LEI', num, ano1 || ano2, 'NI', match);
            });

            // 7. Decreto (DEC)
            txt = txt.replace(/\bDecreto\s+(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('DEC', num, ano1 || ano2, 'NI', match);
            });

            // 8. Medida Provisória (MPV)
            txt = txt.replace(/\b(?:Medida\s+Provis[óo]ria|MPV)\s+(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, num, ano1, ano2) {
                return formatarLinkTextoTag('MPV', num, ano1 || ano2, 'NI', match);
            });

            // 9. Instrução Normativa (INM)
            txt = txt.replace(/\b(?:Instru[çc][ãa]o\s+Normativa|IN)\s+(?:(Anvisa|ANS|MAPA)\s+)?(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, orgTag, num, ano1, ano2) {
                let org = siglaOrgaoContexto || 'NI';
                if (orgTag) {
                    const o = orgTag.toUpperCase();
                    if (o === 'ANVISA') org = 'IN/DC/ANVISA/MS';
                    else if (o === 'ANS') org = 'ANS/MS';
                    else if (o === 'MAPA') org = 'MAPA';
                }
                return formatarLinkTextoTag('INM', num, ano1 || ano2, org, match);
            });

            // 10. Resolução Genérica (RES)
            txt = txt.replace(/\bResolu[çc][ãa]o\s+(?:(Anvisa|ANS|MAPA|MEC|MS)\s+)?(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, orgTag, num, ano1, ano2) {
                let org = 'NI';
                if (orgTag) {
                    const o = orgTag.toUpperCase();
                    if (o === 'ANS') org = 'ANS/MS';
                    else if (o === 'ANVISA') org = 'ANVISA/MS';
                    else org = o;
                }
                return formatarLinkTextoTag('RES', num, ano1 || ano2, org, match);
            });

            // 11. Portaria (POR)
            txt = txt.replace(/\bPortaria\s+(?:([A-Z0-9\-_]+(?:\/[A-Z0-9\-_]+)*)\s+)?(?:n[ºo°\.]\s*|n\.\s*)?([\d\.]+)(?:,\s*de\s+(?:\d{1,2}\s+de\s+[a-zçãõáéíóúâêô]+\s+de\s*|\d{1,2}[\/\-]\d{1,2}[\/\-]\s*)?(\d{4})|\s*[\/\-](\d{2,4}))/gi, function(match, orgTag, num, ano1, ano2) {
                let org = siglaOrgaoContexto || 'NI';
                if (orgTag) {
                    const o = orgTag.toUpperCase();
                    if (o === 'ANS') org = 'ANS/MS';
                    else if (o === 'ANVISA') org = 'ANVISA/MS';
                    else org = o;
                }
                return formatarLinkTextoTag('POR', num, ano1 || ano2, org, match);
            });

            partes[p] = txt;
        }

        return partes.join('');
    }

    // =========================================================================
    // 6. VALIDADOR PRECISO DE INTEGRIDADE DO DOU
    // =========================================================================
    function validarRespostaDOU(res) {
        if (!res || !res.responseText) {
            return { valido: false, erro: "Resposta vazia do servidor." };
        }
        if (res.status && (res.status < 200 || res.status >= 400)) {
            return { valido: false, erro: `HTTP ${res.status} - Servidor do DOU indisponível` };
        }

        const txt = res.responseText;

        if (/<title>\s*(502\s+Bad\s+Gateway|503\s+Service|500\s+Internal|Server\s+Error)\s*<\/title>/i.test(txt) ||
            /<h1[^>]*>\s*(502\s+Bad\s+Gateway|Server\s+Error|Service\s+Unavailable)\s*<\/h1>/i.test(txt)) {
            return { valido: false, erro: "Página de erro do servidor da Imprensa Nacional (502 / Server Error)." };
        }

        return { valido: true };
    }

    // =========================================================================
    // 7. PARSER NATIVO DO DOU
    // =========================================================================
    function parseDOUHeadless(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const corpoTextoPagina = doc.body ? (doc.body.innerText || "") : "";

        let dataDOU = "";
        let numeroDOU = "";
        let secaoDOU = "1";
        let anoDOU = "";

        const matchData = corpoTextoPagina.match(/Publicado em:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
        if (matchData) {
            dataDOU = `${matchData[1]}/${matchData[2]}/${matchData[3]}`;
            anoDOU = matchData[3];
        }

        const matchEdicao = corpoTextoPagina.match(/Edi[çc][ãa]o:\s*(\d+)/i);
        if (matchEdicao) numeroDOU = matchEdicao[1];

        const matchSecao = corpoTextoPagina.match(/Se[çc][ãa]o:\s*(\d+)/i);
        if (matchSecao) secaoDOU = matchSecao[1];

        let orgaoCru = "";
        const matchOrgao = corpoTextoPagina.match(/[ÓO]rg[ãa]o:\s*([^\n\r\|]+)/i);
        if (matchOrgao) {
            orgaoCru = matchOrgao[1].trim();
        } else {
            orgaoCru = doc.querySelector('.orgao')?.innerText?.trim() || "";
        }

        const elIdentifica = doc.querySelector('.identifica');
        const rawTitulo = elIdentifica ? elIdentifica.innerText : "";
        const tituloPrincipal = rawTitulo.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

        let ementaOficial = "";
        const elEmenta = doc.querySelector('.ementa, .dou-paragraph.ementa');
        if (elEmenta) {
            ementaOficial = elEmenta.innerText.trim();
        }

        let primeiroSignatario = "";
        const elPrimeiraAssina = doc.querySelector('.assina, p[class*="assina"]');
        if (elPrimeiraAssina) {
            primeiroSignatario = elPrimeiraAssina.innerText.trim();
        }

        const containerTexto = doc.querySelector('.texto-dou') || doc.querySelector('.conteudo-dou') || doc.body;
        let htmlCorpoSequencial = "";

        if (containerTexto && containerTexto.children) {
            const filhos = containerTexto.children;
            for (let i = 0; i < filhos.length; i++) {
                const filho = filhos[i];

                if (filho.classList.contains('orgao') || 
                    filho.classList.contains('identifica') || 
                    filho.classList.contains('publicado-secao') ||
                    filho.classList.contains('ementa')) {
                    continue;
                }

                const tagName = (filho.tagName || "").toLowerCase();
                const txt = (filho.innerText || "").trim();

                if (txt.includes("Este conteúdo não substitui") ||
                    txt.includes("AUDIÊNCIA DO PORTAL") ||
                    txt.includes("REDES SOCIAIS") ||
                    txt.startsWith("Publicado em:") ||
                    txt.startsWith("Órgão:") ||
                    txt.toUpperCase() === tituloPrincipal) {
                    continue;
                }

                // Assinatura e Cargo
                const isAssina = filho.classList.contains('assina') || (filho.className && filho.className.toString().includes('assina'));
                if (isAssina) {
                    let bloco = txt;
                    if (i + 1 < filhos.length) {
                        const proximo = filhos[i + 1];
                        if (proximo.classList.contains('cargo') || (proximo.className && proximo.className.toString().includes('cargo'))) {
                            bloco += "<br>" + proximo.innerText.trim();
                            i++;
                        }
                    }
                    htmlCorpoSequencial += `<p style="margin-top: 14px; margin-bottom: 14px;">${bloco}</p>\n`;
                    continue;
                }

                if (filho.classList.contains('cargo') || (filho.className && filho.className.toString().includes('cargo'))) {
                    htmlCorpoSequencial += `<p>${txt}</p>\n`;
                    continue;
                }

                // Tabelas
                if (tagName === 'table' || filho.querySelector('table')) {
                    const tabela = tagName === 'table' ? filho : filho.querySelector('table');
                    tabela.setAttribute('border', '1');
                    tabela.setAttribute('cellpadding', '4');
                    tabela.setAttribute('cellspacing', '0');
                    tabela.style.width = '100%';
                    tabela.style.borderCollapse = 'collapse';
                    tabela.style.border = '1px solid #666';
                    tabela.style.marginBottom = '14px';

                    const trs = tabela.querySelectorAll('tr');
                    for (let r = trs.length - 1; r >= 0; r--) {
                        const rowText = trs[r].innerText.replace(/[\s\u00a0]+/g, '').trim();
                        if (!rowText && !trs[r].querySelector('img')) {
                            trs[r].remove();
                        } else {
                            break;
                        }
                    }

                    const celulas = tabela.querySelectorAll('td, th');
                    for (let c = 0; c < celulas.length; c++) {
                        const cel = celulas[c];
                        if (!cel.innerHTML.trim() || cel.innerHTML.trim() === '<p></p>' || cel.innerHTML.trim() === '<br>') {
                            cel.innerHTML = '&nbsp;';
                        }
                        cel.style.border = '1px solid #666';
                        cel.style.padding = '5px 7px';
                        cel.style.fontSize = '12px';
                    }

                    htmlCorpoSequencial += tabela.outerHTML + "\n";
                }
                // Imagens
                else if (tagName === 'img' || filho.querySelector('img')) {
                    const img = tagName === 'img' ? filho : filho.querySelector('img');
                    const src = img.getAttribute('src') || '';
                    const fullSrc = src.startsWith('http') ? src : `https://www.in.gov.br${src}`;
                    htmlCorpoSequencial += `<p style="text-align: center;"><img src="${fullSrc}" style="max-width: 100%; height: auto;"></p>\n`;
                }
                // Parágrafos de Texto
                else if (txt) {
                    if (isSubtituloCurto(txt)) {
                        htmlCorpoSequencial += `<p style="text-align: center; margin-top: 14px; margin-bottom: 8px;">${txt.toUpperCase()}</p>\n`;
                    } else {
                        htmlCorpoSequencial += `<p>${filho.innerHTML.trim()}</p>\n`;
                    }
                }
            }
        }

        if (!primeiroSignatario && corpoTextoPagina) {
            const matchAssinaturaFinal = corpoTextoPagina.match(/(?:[\.\-\–]\s*|\n)([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,})+)\s*(?:\n|$)/);
            if (matchAssinaturaFinal) {
                primeiroSignatario = matchAssinaturaFinal[1].trim();
            }
        }

        const textoCorpo = doc.body ? (doc.body.innerText || "") : "";
        const { numAto, anoAto } = extrairNumeroEAno(tituloPrincipal, textoCorpo, dataDOU, anoDOU);
        const partesOrgao = orgaoCru.split(/\s*\/\s*|\n+/).map(p => p.trim().toUpperCase()).filter(Boolean);
        
        const tipoAto = classificarTipoAto(tituloPrincipal, textoCorpo);
        const siglaOrgao = resolverSiglaOrgao(tituloPrincipal, orgaoCru, tipoAto);

        // Extração exata da data do ato para a ANVISA
        const dataAtoReal = extrairDataDoAto(tituloPrincipal, textoCorpo, dataDOU);

        let tituloFormulario = tituloPrincipal;
        const isAnvisa = (siglaOrgao.includes("ANVISA") || orgaoCru.toUpperCase().includes("ANVISA") || tituloPrincipal.includes("ANVISA"));

        if (isAnvisa) {
            let tipoExtenso = "";
            const tUpper = tituloPrincipal.toUpperCase();
            if (tUpper.includes("DIRETORIA COLEGIADA") || tUpper.includes("RDC") || tipoAto === "RDC") {
                tipoExtenso = "Resolução da Diretoria Colegiada";
            } else if (tUpper.includes("RESOLUÇÃO") || tipoAto === "RES" || tipoAto === "REN" || tipoAto === "RSC") {
                tipoExtenso = "Resolução";
            } else if (tUpper.includes("INSTRUÇÃO NORMATIVA") || tipoAto === "INM" || tipoAto === "INC") {
                tipoExtenso = "Instrução Normativa";
            } else if (tUpper.includes("PORTARIA") || tipoAto === "POR" || tipoAto === "PCJ") {
                tipoExtenso = "Portaria";
            } else if (tUpper.includes("DESPACHO") || tipoAto === "DEP") {
                tipoExtenso = "Despacho";
            }

            if (tipoExtenso && numAto) {
                const numFormatado = isNaN(parseInt(numAto, 10)) ? numAto : parseInt(numAto, 10).toLocaleString('pt-BR');
                const dataParaTitulo = dataAtoReal || dataDOU;
                tituloFormulario = `${tipoExtenso} Anvisa nº ${numFormatado}, de ${dataParaTitulo}`;
            }
        }

        let ementaFormulario = ementaOficial;
        if (!ementaFormulario) {
            ementaFormulario = sugerirEmentaHeuristica(textoCorpo, tituloPrincipal);
        }

        htmlCorpoSequencial = aplicarLinksNoTexto(htmlCorpoSequencial, siglaOrgao);

        let htmlFinal = '<script type="text/javascript" src="/public/js/jquery/jquery-1.6.2.js"></script><script type="text/javascript" src="/public/js/ckeditor_include.js"></script>\n';

        for (let o = 0; o < partesOrgao.length; o++) {
            htmlFinal += `<p style="text-align: center;">${partesOrgao[o]}</p>\n`;
        }

        if (tituloPrincipal) {
            htmlFinal += `<p style="text-align: center;">${tituloPrincipal}</p>\n`;
        }

        if (ementaOficial) {
            htmlFinal += `<p style="margin-left: 50%; text-align: justify; margin-bottom: 16px;">${ementaOficial}</p>\n`;
        }

        htmlFinal += htmlCorpoSequencial;
        htmlFinal += `<p style="margin-top: 16px;">D.O.U., ${dataDOU} - Seção ${secaoDOU}</p>`;

        const situacaoAto = classificarSituacaoAto(ementaFormulario, textoCorpo, dataDOU);

        return {
            siglaOrgao,
            orgaoCru,
            tipoAto,
            situacaoAto,
            numAto,
            anoAto,
            dataDOU,
            numeroDOU,
            secaoDOU,
            assinante: primeiroSignatario,
            titulo: tituloFormulario,
            ementa: ementaFormulario,
            htmlFinal
        };
    }

    // =========================================================================
    // 8. INJEÇÃO DOS DADOS NO FORMULÁRIO DO DATALEGIS
    // =========================================================================
    function selecionarTipoAto(tipoValor) {
        if (!tipoValor) return;
        const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const tipoUpper = tipoValor.toUpperCase().trim();

        const selects = document.querySelectorAll('select[id="SGL_TIPO"], select[name="SGL_TIPO"], select[class*="sgl-tipo"]');
        let matchedText = "";
        let matchedVal = "";

        selects.forEach(sel => {
            if (!sel.options) return;
            for (let i = 0; i < sel.options.length; i++) {
                const opt = sel.options[i];
                const val = (opt.value || "").toUpperCase().trim();
                const txt = (opt.text || "").toUpperCase().trim();

                if (val === tipoUpper || txt === tipoUpper || txt.startsWith(tipoUpper + " ") || txt.startsWith(tipoUpper + " -") || txt.startsWith(tipoUpper + "-") ||
                   (tipoUpper === 'POR' && txt.includes('PORTARIA')) ||
                   (tipoUpper === 'DEP' && txt.includes('DESPACHO')) ||
                   (tipoUpper === 'DEL' && (txt.includes('DECRETO-LEI') || txt.includes('DECRETO LEI'))) ||
                   (tipoUpper === 'DLG' && txt.includes('DECRETO LEGISLATIVO')) ||
                   (tipoUpper === 'DEC' && txt.includes('DECRETO') && !txt.includes('LEI') && !txt.includes('LEGISLATIVO')) ||
                   (tipoUpper === 'LCP' && txt.includes('LEI COMPLEMENTAR')) ||
                   (tipoUpper === 'LEI' && txt.includes('LEI') && !txt.includes('COMPLEMENTAR')) ||
                   (tipoUpper === 'RES' && txt.includes('RESOLUÇÃO'))) {
                    
                    for (let j = 0; j < sel.options.length; j++) sel.options[j].selected = false;
                    opt.selected = true;
                    matchedVal = opt.value;
                    matchedText = opt.text;
                    sel.value = opt.value;
                    break;
                }
            }

            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));

            if (win.jQuery) {
                try {
                    const $s = win.jQuery(sel);
                    $s.val(matchedVal || tipoUpper);
                    $s.trigger('change');
                    $s.trigger('chosen:updated');
                    try { $s.selectmenu('refresh'); } catch(e) {}
                    try { $s.trigger('change.select2'); } catch(e) {}
                } catch(e) {}
            }
        });

        const inputsTipo = document.querySelectorAll('input[id*="SGL_TIPO"], input[name*="SGL_TIPO"]');
        inputsTipo.forEach(inp => {
            inp.value = tipoUpper;
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            if (win.jQuery) {
                try { win.jQuery(inp).val(tipoUpper).trigger('change'); } catch(e) {}
            }
        });

        const chosenContainers = document.querySelectorAll('#SGL_TIPO_chosen, .chosen-container');
        chosenContainers.forEach(container => {
            const span = container.querySelector('.chosen-single span');
            if (span && matchedText) {
                span.innerText = matchedText;
            }
            const single = container.querySelector('.chosen-single');
            if (single) single.classList.remove('chosen-default');

            const lis = container.querySelectorAll('.chosen-results li');
            lis.forEach(li => {
                const txtLi = li.innerText.trim().toUpperCase();
                if (txtLi === matchedText.toUpperCase() || txtLi === tipoUpper || txtLi.startsWith(tipoUpper + " ")) {
                    li.className = 'active-result result-selected';
                } else if (li.classList.contains('result-selected')) {
                    li.className = 'active-result';
                }
            });
        });
    }

    function selecionarSituacaoAto(situacaoTexto) {
        if (!situacaoTexto) return;
        const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const normAlvo = situacaoTexto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

        const sel = document.getElementById('NUM_STATUS') || document.querySelector('select[name="NUM_STATUS"]');
        if (!sel || !sel.options) return;

        let optIndex = -1;
        for (let i = 0; i < sel.options.length; i++) {
            const txt = (sel.options[i].text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
            const val = (sel.options[i].value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

            if (txt === normAlvo || val === normAlvo || txt.startsWith(normAlvo) || val.startsWith(normAlvo)) {
                optIndex = i;
                break;
            }
        }

        if (optIndex !== -1) {
            for (let j = 0; j < sel.options.length; j++) sel.options[j].selected = (j === optIndex);
            sel.selectedIndex = optIndex;
            sel.value = sel.options[optIndex].value;

            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));

            if (win.jQuery) {
                try {
                    const $s = win.jQuery(sel);
                    $s.val(sel.value).trigger('change');
                    $s.trigger('chosen:updated');
                    try { $s.selectmenu('refresh'); } catch(e) {}
                } catch(e) {}
            }
        }
    }

    function aplicarDadosNoFormulario(dados) {
        const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        function setCampo(idAlvo, valor) {
            const valStr = (valor !== undefined && valor !== null) ? String(valor) : "";
            const nodelist = document.querySelectorAll(`[id="${idAlvo}"], [name="${idAlvo}"]`);
            let campo = null;

            for (let i = 0; i < nodelist.length; i++) {
                if (nodelist[i].type !== 'hidden' && nodelist[i].style.display !== 'none') {
                    campo = nodelist[i];
                    break;
                }
            }
            if (!campo && nodelist.length > 0) campo = nodelist[0];
            if (!campo) return;

            campo.value = valStr;
            campo.dispatchEvent(new Event('input', { bubbles: true }));
            campo.dispatchEvent(new Event('change', { bubbles: true }));
            campo.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        selecionarTipoAto(dados.tipoAto);
        selecionarSituacaoAto(dados.situacaoAto);

        setCampo('NUM_ATO', dados.numAto);
        setCampo('SEQ_ATO', "000");
        setCampo('VLR_ANO', dados.anoAto);
        setCampo('SGL_ORGAO', dados.siglaOrgao);
        setCampo('COD_LOCAL', "BR");
        setCampo('DES_NUM_ATO', "RB");
        setCampo('DES_TITULO', dados.titulo || "");
        setCampo('DTA_PROMULGACAO', dados.dataDOU);
        setCampo('NUM_DOU', dados.numeroDOU);
        setCampo('secao', dados.secaoDOU);
        setCampo('DES_EMITENTE', dados.assinante || "");

        try {
            if (win.CKEDITOR && win.CKEDITOR.instances) {
                const insts = win.CKEDITOR.instances;

                if (insts['TXT_EMENTA']) {
                    insts['TXT_EMENTA'].setData(dados.ementa || "");
                }

                if (insts['TXT_TEXTO'] && dados.htmlFinal) {
                    insts['TXT_TEXTO'].setData(dados.htmlFinal);
                }

                if (insts['TXT_CABECALHO']) insts['TXT_CABECALHO'].setData("");
                if (insts['TXT_RODAPE']) insts['TXT_RODAPE'].setData("");
            }
        } catch(e) {}

        const txtEmenta = document.getElementById('TXT_EMENTA');
        if (txtEmenta) {
            txtEmenta.value = dados.ementa || "";
            txtEmenta.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const txtCorpo = document.getElementById('TXT_TEXTO');
        if (txtCorpo && dados.htmlFinal) {
            txtCorpo.value = dados.htmlFinal;
            txtCorpo.dispatchEvent(new Event('change', { bubbles: true }));
        }

        try {
            const ckeEmenta = document.getElementById('cke_TXT_EMENTA') || document.querySelector('[id*="TXT_EMENTA"]')?.closest('.cke');
            const ifrEmenta = ckeEmenta ? ckeEmenta.querySelector('iframe') : null;
            if (ifrEmenta && ifrEmenta.contentDocument && ifrEmenta.contentDocument.body) {
                ifrEmenta.contentDocument.body.innerHTML = dados.ementa || "";
            }

            const ckeTexto = document.getElementById('cke_TXT_TEXTO') || document.querySelector('[id*="TXT_TEXTO"]')?.closest('.cke');
            const ifrTexto = ckeTexto ? ckeTexto.querySelector('iframe') : null;
            if (ifrTexto && ifrTexto.contentDocument && ifrTexto.contentDocument.body && dados.htmlFinal) {
                ifrTexto.contentDocument.body.innerHTML = dados.htmlFinal;
            }
        } catch(e) {}

        registrarLinkTextoGlobal();
    }

    // =========================================================================
    // 9. ATALHO DE TECLADO (ALT + S / OPTION + S NO MAC)
    // =========================================================================
    window.addEventListener('keydown', function(e) {
        if (e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
            e.preventDefault();
            e.stopPropagation();

            const campoOrgao = document.getElementById('SGL_ORGAO') || document.querySelector('[name="SGL_ORGAO"]');
            const orgaoCruAtual = GM_getValue('dou_ultimo_orgao_cru', '');
            if (campoOrgao && campoOrgao.value && orgaoCruAtual) {
                salvarNovoOrgaoNaPlanilha(orgaoCruAtual, campoOrgao.value);
            }

            const botoes = document.querySelectorAll('input[type="submit"], input[type="button"], button');
            for (let b = 0; b < botoes.length; b++) {
                const val = botoes[b].value || botoes[b].innerText || "";
                if (val === 'Salvar' || val === 'Salvar & Fechar') {
                    botoes[b].click();
                    break;
                }
            }
        }
    }, true);

    // =========================================================================
    // 10. PAINEL VISUAL RESPONSIVO (ANTI-ESMAGAMENTO)
    // =========================================================================
    let lastCheckedVisibleIdx = null;

    function iniciarPainelRobo() {
        if (document.getElementById('datalegis-hud')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #datalegis-hud {
                position: fixed; top: 15px; right: 15px; z-index: 9999999;
                width: 440px; height: calc(100vh - 30px); max-height: 700px; min-height: 420px; max-width: 95vw;
                resize: both; overflow: hidden;
                background: rgba(11, 17, 32, 0.96);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px;
                box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05);
                display: none; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif;
                color: #f1f5f9;
            }
            #datalegis-hud * {
                box-sizing: border-box !important;
                font-family: inherit;
                text-shadow: none !important;
            }
            #datalegis-hud-header {
                padding: 10px 14px; background: rgba(30, 41, 59, 0.5);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                cursor: grab; display: flex; align-items: center; justify-content: space-between;
                user-select: none; flex-shrink: 0 !important;
            }
            #datalegis-hud-header:active { cursor: grabbing; }
            #datalegis-hud-body {
                padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; overflow: hidden;
            }
            .hud-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex-shrink: 0 !important; }
            
            .hud-input-base {
                width: 100% !important; height: 32px !important; line-height: 18px !important;
                padding: 0 8px !important; background: rgba(30, 41, 59, 0.55) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 7px !important; color: #f8fafc !important;
                font-size: 11.5px !important; font-weight: 500 !important;
                outline: none !important; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                text-overflow: ellipsis; white-space: nowrap; overflow: hidden;
                flex-shrink: 0 !important;
            }
            .hud-input-base:focus {
                border-color: #38bdf8 !important;
                background: rgba(30, 41, 59, 0.85) !important;
                box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15) !important;
            }

            .hud-search-input {
                height: 36px !important;
                font-size: 12.5px !important;
                padding: 0 12px !important;
                border-radius: 7px !important;
                background: rgba(30, 41, 59, 0.7) !important;
                border: 1px solid rgba(56, 189, 248, 0.25) !important;
                flex-shrink: 0 !important;
            }
            .hud-search-input:focus {
                border-color: #38bdf8 !important;
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
            }
            
            .hud-select {
                appearance: none !important; -webkit-appearance: none !important; -moz-appearance: none !important;
                background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E') !important;
                background-repeat: no-repeat !important;
                background-position: right 8px center !important;
                background-size: 7px !important;
                padding-right: 22px !important;
                cursor: pointer;
                flex-shrink: 0 !important;
            }

            .hud-btn {
                width: 100% !important; height: 34px !important; border-radius: 7px !important;
                font-size: 11.5px !important; font-weight: 600 !important;
                cursor: pointer !important; display: flex !important;
                align-items: center !important; justify-content: center !important; gap: 5px !important;
                border: none !important; transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1) !important;
                flex-shrink: 0 !important;
            }
            .hud-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
            .hud-btn:active { transform: translateY(0); filter: brightness(0.95); }
            
            .hud-btn-primary {
                background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
                color: #ffffff !important;
                box-shadow: 0 3px 12px rgba(14, 165, 233, 0.25) !important;
            }
            .hud-btn-success {
                background: linear-gradient(135deg, #10b981, #059669) !important;
                color: #ffffff !important;
                box-shadow: 0 3px 12px rgba(16, 185, 129, 0.22) !important;
            }
            .hud-btn-warning {
                background: rgba(245, 158, 11, 0.12) !important;
                color: #fbbf24 !important;
                border: 1px solid rgba(245, 158, 11, 0.25) !important;
            }
            .hud-btn-warning:hover { background: rgba(245, 158, 11, 0.2) !important; }
            
            .hud-btn-danger {
                background: rgba(239, 68, 68, 0.12) !important;
                color: #f87171 !important;
                border: 1px solid rgba(239, 68, 68, 0.25) !important;
            }
            .hud-btn-danger:hover { background: rgba(239, 68, 68, 0.2) !important; }

            .hud-icon-btn {
                background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
                color: #94a3b8; border-radius: 6px; width: 26px; height: 26px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.15s ease; font-size: 12px;
            }
            .hud-icon-btn:hover {
                background: rgba(255, 255, 255, 0.12); color: #f8fafc; border-color: rgba(255, 255, 255, 0.2);
            }
            
            .hud-progress-bg {
                width: 100%; height: 3px; background: rgba(255, 255, 255, 0.06);
                border-radius: 2px; overflow: hidden; flex-shrink: 0 !important;
            }
            .hud-progress-fill {
                height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8);
                width: 0%; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            #hud-list-header {
                padding: 6px 8px; background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 7px;
                display: flex; justify-content: space-between; align-items: center;
                font-size: 10.5px; font-weight: 600; flex-shrink: 0 !important;
            }

            .hud-list-box {
                flex: 1 1 auto; overflow-y: auto; background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;
                padding: 5px; min-height: 80px;
            }
            .hud-list-box::-webkit-scrollbar { width: 5px; }
            .hud-list-box::-webkit-scrollbar-track { background: transparent; }
            .hud-list-box::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 4px; }
            .hud-list-box::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

            .hud-card {
                padding: 6px 8px; border-radius: 7px; margin-bottom: 4px;
                background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255, 255, 255, 0.03);
                display: flex; align-items: center; gap: 7px; font-size: 11px;
                transition: all 0.15s ease; user-select: none;
            }
            .hud-card:hover {
                background: rgba(30, 41, 59, 0.6); border-color: rgba(56, 189, 248, 0.25);
            }
            
            .hud-badge {
                font-size: 8.5px; padding: 2px 6px; border-radius: 9999px;
                font-weight: 700; white-space: nowrap; letter-spacing: 0.03em; text-transform: uppercase;
            }
            .hud-badge-done { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
            .hud-badge-proc { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
            .hud-badge-pend { background: rgba(148, 163, 184, 0.12); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
            .hud-badge-err  { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

            .hud-pill {
                display: flex; position: fixed; top: 15px; right: 15px; z-index: 9999999;
                background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(16px);
                border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 30px;
                padding: 6px 14px; color: #fff; font-size: 11.5px; font-weight: 600;
                cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.6); align-items: center; gap: 7px;
            }

            #hud-modal-orgao-overlay {
                display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); z-index: 10000000;
                align-items: center; justify-content: center;
            }
            #hud-modal-orgao-card {
                width: 460px; max-width: 90vw; background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.3);
                border-radius: 12px; padding: 16px; box-shadow: 0 20px 45px rgba(0,0,0,0.9);
                display: flex; flex-direction: column; gap: 10px; color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
        `;
        document.head.appendChild(style);

        const painel = document.createElement('div');
        painel.id = 'datalegis-hud';

        const pill = document.createElement('div');
        pill.className = 'hud-pill';
        pill.innerHTML = '⚡ <strong>Robô DOU</strong> <span id="pill-status" style="color: #38bdf8;">(0/0)</span>';
        document.body.appendChild(pill);

        const header = document.createElement('div');
        header.id = 'datalegis-hud-header';
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 7px;">
                <span style="font-size: 13px;">⚡</span>
                <span style="font-size: 12.5px; font-weight: 700; color: #f8fafc;">Robô DOU</span>
                <span style="font-size: 9.5px; font-weight: 600; padding: 1px 5px; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); border-radius: 5px;">v14.4</span>
            </div>
            <div style="display: flex; gap: 5px;">
                <button id="btn-open-orgao-modal" class="hud-icon-btn" title="Cadastrar Órgão na Planilha Google">🏛️</button>
                <button id="btn-export-csv" class="hud-icon-btn" title="Baixar relatório CSV">📥</button>
                <button id="btn-minimize-hud" class="hud-icon-btn" title="Minimizar">─</button>
            </div>
        `;
        painel.appendChild(header);

        const body = document.createElement('div');
        body.id = 'datalegis-hud-body';

        // Linha 1: Data e Seção
        const gridDataSecao = document.createElement('div');
        gridDataSecao.className = 'hud-grid-2';

        const inputData = document.createElement('input');
        inputData.type = 'date';
        inputData.className = 'hud-input-base';
        const hoje = new Date();
        inputData.value = GM_getValue('dou_data_busca', `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`);

        const selectSecao = document.createElement('select');
        selectSecao.className = 'hud-input-base hud-select';
        [
            { val: 'do1', label: 'Seção 1 (Normas)' },
            { val: 'do2', label: 'Seção 2 (Pessoal)' },
            { val: 'do3', label: 'Seção 3 (Contratos/Editais)' },
            { val: 'doe', label: 'Edição Extra' }
        ].forEach(op => {
            const opt = document.createElement('option');
            opt.value = op.val;
            opt.innerText = op.label;
            selectSecao.appendChild(opt);
        });
        selectSecao.value = GM_getValue('dou_secao_busca', 'do1');

        gridDataSecao.appendChild(inputData);
        gridDataSecao.appendChild(selectSecao);
        body.appendChild(gridDataSecao);

        // Linha 2: Botão de Busca
        const btnBuscar = document.createElement('button');
        btnBuscar.className = 'hud-btn hud-btn-primary';
        btnBuscar.innerHTML = '<span>🔍</span> <span>Buscar Atos no DOU</span>';
        body.appendChild(btnBuscar);

        // Linha 3: Organização Principal
        const selectOrgPrincipal = document.createElement('select');
        selectOrgPrincipal.className = 'hud-input-base hud-select';
        selectOrgPrincipal.innerHTML = '<option value="">Selecionar Organização Principal (Todas)</option>';
        body.appendChild(selectOrgPrincipal);

        // Linha 4: Organização Subordinada & Tipo do Ato
        const gridSubTipo = document.createElement('div');
        gridSubTipo.className = 'hud-grid-2';

        const selectOrgSubordinada = document.createElement('select');
        selectOrgSubordinada.className = 'hud-input-base hud-select';
        selectOrgSubordinada.innerHTML = '<option value="">Org. Subordinada (Todas)</option>';

        const selectTipoAtoFiltro = document.createElement('select');
        selectTipoAtoFiltro.className = 'hud-input-base hud-select';
        selectTipoAtoFiltro.innerHTML = '<option value="">Tipo do Ato (Todos)</option>';

        gridSubTipo.appendChild(selectOrgSubordinada);
        gridSubTipo.appendChild(selectTipoAtoFiltro);
        body.appendChild(gridSubTipo);

        // Linha 5: Busca Livre Expandida
        const inputFiltroTexto = document.createElement('input');
        inputFiltroTexto.type = 'text';
        inputFiltroTexto.className = 'hud-input-base hud-search-input';
        inputFiltroTexto.placeholder = '🔎 Filtrar nesta lista (ex: Portaria, MAPA, 441)...';
        body.appendChild(inputFiltroTexto);

        // Barra de Progresso
        const progressBg = document.createElement('div');
        progressBg.className = 'hud-progress-bg';
        const progressFill = document.createElement('div');
        progressFill.className = 'hud-progress-fill';
        progressBg.appendChild(progressFill);
        body.appendChild(progressBg);

        // Cabeçalho Estático da Lista Fixo
        const headerListaFixo = document.createElement('div');
        headerListaFixo.id = 'hud-list-header';
        headerListaFixo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="checkbox" id="chk-selecionar-todos-filtro">
                    <span>Selecionar do Filtro</span>
                </label>
                <button id="btn-desmarcar-tudo" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 9.5px; text-decoration: underline;" title="Desmarcar todos os atos da fila">Limpar Seleção</button>
            </div>
            <span id="hud-contador-visiveis" style="color: #38bdf8; font-size: 10px;">0/0 visíveis</span>
        `;
        body.appendChild(headerListaFixo);

        // Container com Scroll dos Cards
        const containerLista = document.createElement('div');
        containerLista.className = 'hud-list-box';
        body.appendChild(containerLista);

        const labelPausa = document.createElement('label');
        labelPausa.style.display = 'flex';
        labelPausa.style.alignItems = 'center';
        labelPausa.style.gap = '6px';
        labelPausa.style.fontSize = '10.5px';
        labelPausa.style.color = '#94a3b8';
        labelPausa.style.cursor = 'pointer';
        labelPausa.style.flexShrink = '0';
        const checkPausa = document.createElement('input');
        checkPausa.type = 'checkbox';
        checkPausa.checked = GM_getValue('dou_modo_pausa', true);
        checkPausa.onchange = () => GM_setValue('dou_modo_pausa', checkPausa.checked);
        labelPausa.appendChild(checkPausa);
        labelPausa.appendChild(document.createTextNode('Pausar para conferência (Salvar via Alt + S)'));
        body.appendChild(labelPausa);

        const statusLabel = document.createElement('div');
        statusLabel.id = 'robo-status';
        statusLabel.style.fontSize = '10.5px';
        statusLabel.style.textAlign = 'center';
        statusLabel.style.padding = '5px';
        statusLabel.style.background = 'rgba(255, 255, 255, 0.03)';
        statusLabel.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        statusLabel.style.borderRadius = '6px';
        statusLabel.style.color = '#94a3b8';
        statusLabel.style.flexShrink = '0';
        statusLabel.innerText = 'Aguardando busca no DOU';
        body.appendChild(statusLabel);

        const btnIniciar = document.createElement('button');
        btnIniciar.className = 'hud-btn hud-btn-success';
        btnIniciar.innerHTML = '<span>▶</span> <span>Processar Atos Selecionados</span>';
        body.appendChild(btnIniciar);

        const gridAux = document.createElement('div');
        gridAux.className = 'hud-grid-2';

        const btnPausar = document.createElement('button');
        btnPausar.className = 'hud-btn hud-btn-warning';
        btnPausar.innerText = '⏸ Pausar';

        const btnLimpar = document.createElement('button');
        btnLimpar.className = 'hud-btn hud-btn-danger';
        btnLimpar.innerText = '🗑️ Limpar';

        gridAux.appendChild(btnPausar);
        gridAux.appendChild(btnLimpar);
        body.appendChild(gridAux);

        painel.appendChild(body);
        document.body.appendChild(painel);

        // =====================================================================
        // MODAL DE CADASTRO DE ÓRGÃO
        // =====================================================================
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'hud-modal-orgao-overlay';
        modalOverlay.innerHTML = `
            <div id="hud-modal-orgao-card">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;">
                    <strong style="font-size: 13px; color: #38bdf8;">🏛️ Cadastrar Órgão na Planilha Nuvem</strong>
                    <button id="btn-modal-fechar-orgao" style="background: none; border: none; color: #94a3b8; font-size: 15px; cursor: pointer;">✕</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <label style="font-size: 10.5px; color: #94a3b8;">Nome Completo do Órgão no DOU (conforme diário):</label>
                    <textarea id="modal-orgao-nome" rows="2" style="width: 100%; padding: 7px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff; font-size: 11.5px; outline: none; resize: vertical;" placeholder="Ex: MINISTÉRIO DA SAÚDE / AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA / DIRETORIA COLEGIADA"></textarea>
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <label style="font-size: 10.5px; color: #94a3b8;">Sigla Hierárquica Datalegis (iniciando pela subunidade):</label>
                    <input type="text" id="modal-orgao-sigla" style="width: 100%; height: 32px; padding: 0 8px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff; font-size: 11.5px; outline: none;" placeholder="Ex: DC/ANVISA/MS">
                </div>
                <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button id="btn-modal-salvar-orgao" style="flex: 1; height: 34px; background: #16a34a; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11.5px;">💾 Salvar na Planilha</button>
                    <button id="btn-modal-cancelar-orgao" style="flex: 1; height: 34px; background: #334155; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11.5px;">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const inputModalNome = modalOverlay.querySelector('#modal-orgao-nome');
        const inputModalSigla = modalOverlay.querySelector('#modal-orgao-sigla');
        const btnModalSalvar = modalOverlay.querySelector('#btn-modal-salvar-orgao');
        const btnModalFechar = modalOverlay.querySelector('#btn-modal-fechar-orgao');
        const btnModalCancelar = modalOverlay.querySelector('#btn-modal-cancelar-orgao');

        function fecharModalOrgao() {
            modalOverlay.style.display = 'none';
        }

        btnModalFechar.onclick = fecharModalOrgao;
        btnModalCancelar.onclick = fecharModalOrgao;

        const btnOpenOrgao = header.querySelector('#btn-open-orgao-modal');
        btnOpenOrgao.onclick = () => {
            const orgaoCruAtual = GM_getValue('dou_ultimo_orgao_cru', '');
            const campoOrgaoForm = document.getElementById('SGL_ORGAO') || document.querySelector('[name="SGL_ORGAO"]');
            
            inputModalNome.value = orgaoCruAtual || "";
            inputModalSigla.value = (campoOrgaoForm && campoOrgaoForm.value) ? campoOrgaoForm.value : "";

            modalOverlay.style.display = 'flex';
            if (!inputModalNome.value) inputModalNome.focus();
            else inputModalSigla.focus();
        };

        btnModalSalvar.onclick = () => {
            const nome = inputModalNome.value.trim().toUpperCase();
            const sigla = inputModalSigla.value.trim().toUpperCase();

            if (!nome || !sigla) {
                alert('⚠️ Preencha tanto o Nome no DOU quanto a Sigla Datalegis.');
                return;
            }

            btnModalSalvar.innerText = '⏳ Salvando...';

            salvarNovoOrgaoNaPlanilha(nome, sigla, (sucesso) => {
                btnModalSalvar.innerText = '💾 Salvar na Planilha';
                if (sucesso) {
                    alert(`✅ Órgão salvo com sucesso no Google Sheets!\n\n${nome} ➔ ${sigla}`);
                    
                    const campoOrgaoForm = document.getElementById('SGL_ORGAO') || document.querySelector('[name="SGL_ORGAO"]');
                    if (campoOrgaoForm) {
                        campoOrgaoForm.value = sigla;
                        campoOrgaoForm.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    fecharModalOrgao();
                } else {
                    alert('❌ Não foi possível salvar na planilha. Verifique sua conexão.');
                }
            });
        };

        // --- SISTEMA DE ARRASTAR ---
        let isDragging = false, startX, startY, initialLeft, initialTop;
        header.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = painel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            painel.style.left = `${initialLeft + (e.clientX - startX)}px`;
            painel.style.top = `${initialTop + (e.clientY - startY)}px`;
            painel.style.right = 'auto';
        });
        window.addEventListener('mouseup', () => isDragging = false);

        // --- MINIMIZAR / MAXIMIZAR ---
        const btnMin = header.querySelector('#btn-minimize-hud');
        btnMin.onclick = () => {
            painel.style.display = 'none';
            pill.style.display = 'flex';
        };
        pill.onclick = () => {
            pill.style.display = 'none';
            painel.style.display = 'flex';
        };

        // =====================================================================
        // POPULADOR E ATUALIZADOR DOS FILTROS HIERÁRQUICOS
        // =====================================================================
        function atualizarFiltrosCascata() {
            const fila = JSON.parse(GM_getValue('dou_fila', '[]'));
            const orgPrincAtual = selectOrgPrincipal.value;
            const orgSubAtual = selectOrgSubordinada.value;
            const tipoAtoAtual = selectTipoAtoFiltro.value;

            const orgsPrincipais = [...new Set(fila.map(it => it.orgPrincipal).filter(Boolean))].sort();
            selectOrgPrincipal.innerHTML = '<option value="">Selecionar Organização Principal (Todas)</option>';
            orgsPrincipais.forEach(op => {
                const opt = document.createElement('option');
                opt.value = op;
                opt.innerText = op;
                if (op === orgPrincAtual) opt.selected = true;
                selectOrgPrincipal.appendChild(opt);
            });

            const filaFiltradaOrg = orgPrincAtual ? fila.filter(it => it.orgPrincipal === orgPrincAtual) : fila;
            const orgsSubordinadas = [...new Set(filaFiltradaOrg.map(it => it.orgSubordinada).filter(Boolean))].sort();
            selectOrgSubordinada.innerHTML = '<option value="">Org. Subordinada (Todas)</option>';
            orgsSubordinadas.forEach(os => {
                const opt = document.createElement('option');
                opt.value = os;
                opt.innerText = os;
                if (os === orgSubAtual) opt.selected = true;
                selectOrgSubordinada.appendChild(opt);
            });

            const filaFiltradaSub = orgSubAtual ? filaFiltradaOrg.filter(it => it.orgSubordinada === orgSubAtual) : filaFiltradaOrg;
            const tiposAto = [...new Set(filaFiltradaSub.map(it => it.tipoAtoNome).filter(Boolean))].sort();
            selectTipoAtoFiltro.innerHTML = '<option value="">Tipo do Ato (Todos)</option>';
            tiposAto.forEach(tp => {
                const opt = document.createElement('option');
                opt.value = tp;
                opt.innerText = tp;
                if (tp === tipoAtoAtual) opt.selected = true;
                selectTipoAtoFiltro.appendChild(opt);
            });
        }

        // =====================================================================
        // RENDERIZADOR COM SHIFT+CLICK E SELEÇÃO DE VISÍVEIS
        // =====================================================================
        function renderizarListaAtos() {
            const fila = JSON.parse(GM_getValue('dou_fila', '[]'));
            const orgPrincFiltro = selectOrgPrincipal.value;
            const orgSubFiltro = selectOrgSubordinada.value;
            const tipoAtoFiltro = selectTipoAtoFiltro.value;
            const textoFiltro = inputFiltroTexto.value.toUpperCase();

            containerLista.innerHTML = '';

            const feitos = fila.filter(it => it.status === 'FEITO').length;
            const total = fila.length;
            const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
            progressFill.style.width = `${pct}%`;

            const pillStatus = document.getElementById('pill-status');
            if (pillStatus) pillStatus.innerText = `(${feitos}/${total}) ${pct}%`;

            if (fila.length === 0) {
                containerLista.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 11px; padding: 14px;">Nenhum ato na fila. Clique em Buscar.</div>';
                document.getElementById('hud-contador-visiveis').innerText = `0/0 visíveis`;
                document.getElementById('chk-selecionar-todos-filtro').checked = false;
                return;
            }

            const itensVisiveis = [];
            for (let i = 0; i < fila.length; i++) {
                const item = fila[i];
                if (orgPrincFiltro && item.orgPrincipal !== orgPrincFiltro) continue;
                if (orgSubFiltro && item.orgSubordinada !== orgSubFiltro) continue;
                if (tipoAtoFiltro && item.tipoAtoNome !== tipoAtoFiltro) continue;
                if (textoFiltro) {
                    const txtCompleto = `${item.titulo} ${item.orgPrincipal || ''} ${item.orgSubordinada || ''}`.toUpperCase();
                    if (!txtCompleto.includes(textoFiltro)) continue;
                }
                itensVisiveis.push({ item, idxReal: i });
            }

            const chkTodosFixo = document.getElementById('chk-selecionar-todos-filtro');
            const lblContadorFixo = document.getElementById('hud-contador-visiveis');
            const btnDesmarcarTudo = document.getElementById('btn-desmarcar-tudo');

            const totalSelecionadosGeral = fila.filter(it => it.selecionado === true).length;
            const selVisiveis = itensVisiveis.filter(obj => obj.item.selecionado === true).length;

            chkTodosFixo.checked = itensVisiveis.length > 0 && itensVisiveis.every(obj => obj.item.selecionado === true);
            lblContadorFixo.innerText = `${selVisiveis}/${itensVisiveis.length} visíveis (${totalSelecionadosGeral} total)`;

            chkTodosFixo.onclick = () => {
                const marcar = chkTodosFixo.checked;
                itensVisiveis.forEach(obj => {
                    fila[obj.idxReal].selecionado = marcar;
                });
                GM_setValue('dou_fila', JSON.stringify(fila));
                renderizarListaAtos();
            };

            btnDesmarcarTudo.onclick = () => {
                fila.forEach(it => it.selecionado = false);
                GM_setValue('dou_fila', JSON.stringify(fila));
                renderizarListaAtos();
            };

            if (itensVisiveis.length === 0) {
                containerLista.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 11px; padding: 14px;">Nenhum ato corresponde ao filtro selecionado.</div>';
                return;
            }

            for (let v = 0; v < itensVisiveis.length; v++) {
                const { item, idxReal } = itensVisiveis[v];
                const card = document.createElement('div');
                card.className = 'hud-card';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = item.selecionado === true;

                chk.onclick = function(e) {
                    const isChecked = this.checked;
                    const currentVisibleIdx = v;

                    if (e.shiftKey && lastCheckedVisibleIdx !== null && lastCheckedVisibleIdx !== currentVisibleIdx) {
                        const start = Math.min(lastCheckedVisibleIdx, currentVisibleIdx);
                        const end = Math.max(lastCheckedVisibleIdx, currentVisibleIdx);

                        for (let k = start; k <= end; k++) {
                            const realIdx = itensVisiveis[k].idxReal;
                            fila[realIdx].selecionado = isChecked;
                        }
                        GM_setValue('dou_fila', JSON.stringify(fila));
                        renderizarListaAtos();
                    } else {
                        fila[idxReal].selecionado = isChecked;
                        GM_setValue('dou_fila', JSON.stringify(fila));
                        
                        const totalSelAtual = fila.filter(it => it.selecionado === true).length;
                        const selAtualVisivel = itensVisiveis.filter(obj => fila[obj.idxReal].selecionado === true).length;
                        lblContadorFixo.innerText = `${selAtualVisivel}/${itensVisiveis.length} visíveis (${totalSelAtual} total)`;
                        chkTodosFixo.checked = itensVisiveis.every(obj => fila[obj.idxReal].selecionado === true);
                    }
                    lastCheckedVisibleIdx = currentVisibleIdx;
                };

                const divInfo = document.createElement('div');
                divInfo.style.flex = '1';
                divInfo.style.overflow = 'hidden';
                divInfo.innerHTML = `
                    <div style="display: flex; align-items: baseline; gap: 4px;">
                        <span style="color: #64748b; font-weight: 700; font-size: 9.5px;">#${idxReal + 1}</span>
                        <a href="${item.url}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 600;">${item.titulo}</a>
                    </div>
                    <div style="color: #94a3b8; font-size: 9.5px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${item.orgPrincipal || ''} ${item.orgSubordinada ? '▸ ' + item.orgSubordinada : ''}
                    </div>
                `;

                const badge = document.createElement('span');
                if (item.status === 'FEITO') {
                    badge.className = 'hud-badge hud-badge-done';
                    badge.innerText = 'FEITO';
                } else if (item.status === 'PROCESSANDO') {
                    badge.className = 'hud-badge hud-badge-proc';
                    badge.innerText = 'EM CURSO';
                } else if (item.status && item.status.startsWith('ERRO')) {
                    badge.className = 'hud-badge hud-badge-err';
                    badge.title = item.status;
                    badge.innerText = 'ERRO';
                } else {
                    badge.className = 'hud-badge hud-badge-pend';
                    badge.innerText = 'PENDENTE';
                }

                card.appendChild(chk);
                card.appendChild(divInfo);
                card.appendChild(badge);
                containerLista.appendChild(card);
            }
        }

        selectOrgPrincipal.onchange = () => {
            selectOrgSubordinada.value = "";
            selectTipoAtoFiltro.value = "";
            lastCheckedVisibleIdx = null;
            atualizarFiltrosCascata();
            renderizarListaAtos();
        };

        selectOrgSubordinada.onchange = () => {
            selectTipoAtoFiltro.value = "";
            lastCheckedVisibleIdx = null;
            atualizarFiltrosCascata();
            renderizarListaAtos();
        };

        selectTipoAtoFiltro.onchange = () => {
            lastCheckedVisibleIdx = null;
            renderizarListaAtos();
        };

        inputFiltroTexto.oninput = () => {
            lastCheckedVisibleIdx = null;
            renderizarListaAtos();
        };

        atualizarFiltrosCascata();
        renderizarListaAtos();

        // =====================================================================
        // BUSCA NO DOU
        // =====================================================================
        btnBuscar.onclick = async () => {
            if (!inputData.value) return alert('Selecione uma data.');
            const partesData = inputData.value.split('-');
            const dataUrlDOU = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
            const secaoCodigo = selectSecao.value;

            GM_setValue('dou_data_busca', inputData.value);
            GM_setValue('dou_secao_busca', secaoCodigo);

            btnBuscar.innerHTML = '<span>⏳</span> <span>Varrendo DOU...</span>';
            btnBuscar.className = 'hud-btn hud-btn-warning';

            await new Promise(resolve => sincronizarDicionarioNuvem(resolve));

            let atosEncontrados = [];
            let linksVistos = new Set();
            let pagina = 1;
            let continuar = true;
            let erroDetectadoServidor = false;

            while (continuar && pagina <= 300) {
                statusLabel.innerText = `Lendo página ${pagina} do DOU...`;
                const url = `https://www.in.gov.br/leiturajornal?data=${dataUrlDOU}&secao=${secaoCodigo}&pagina=${pagina}`;

                await new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        onload: function(res) {
                            try {
                                const validacao = validarRespostaDOU(res);
                                if (!validacao.valido) {
                                    erroDetectadoServidor = true;
                                    alert(`⚠️ O site da Imprensa Nacional (DOU) está temporariamente indisponível no momento.\n\nDetalhes: ${validacao.erro}`);
                                    continuar = false;
                                    resolve();
                                    return;
                                }

                                const parser = new DOMParser();
                                const doc = parser.parseFromString(res.responseText, 'text/html');
                                let novos = 0;

                                const scriptParams = doc.getElementById('params');
                                if (scriptParams && scriptParams.textContent) {
                                    const json = JSON.parse(scriptParams.textContent);
                                    if (json && json.jsonArray) {
                                        for (let j = 0; j < json.jsonArray.length; j++) {
                                            const item = json.jsonArray[j];
                                            const link = `https://www.in.gov.br/web/dou/-/${item.urlTitle}`;
                                            const rawTit = item.title || item.hierarchyStr || 'ATO';
                                            const tit = rawTit.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                                            
                                            let orgPrincipal = "";
                                            let orgSubordinada = "";
                                            if (item.hierarchyList && item.hierarchyList.length > 0) {
                                                orgPrincipal = item.hierarchyList[0].trim();
                                                if (item.hierarchyList.length > 1) {
                                                    orgSubordinada = item.hierarchyList.slice(1).join(' / ').trim();
                                                }
                                            } else if (item.hierarchyStr) {
                                                const partesH = item.hierarchyStr.split('/');
                                                orgPrincipal = partesH[0].trim();
                                                if (partesH.length > 1) orgSubordinada = partesH.slice(1).join(' / ').trim();
                                            }

                                            const tipoAtoNome = extrairNomeTipoAto(tit);

                                            if (!linksVistos.has(link)) {
                                                linksVistos.add(link);
                                                atosEncontrados.push({
                                                    url: link,
                                                    titulo: tit,
                                                    orgPrincipal: orgPrincipal,
                                                    orgSubordinada: orgSubordinada,
                                                    tipoAtoNome: tipoAtoNome,
                                                    selecionado: false,
                                                    status: 'PENDENTE'
                                                });
                                                novos++;
                                            }
                                        }
                                    }
                                }

                                if (novos === 0) {
                                    const linksDoc = doc.querySelectorAll('h5.title-marker a, a[href*="/web/dou/-/"]');
                                    for (let l = 0; l < linksDoc.length; l++) {
                                        const a = linksDoc[l];
                                        const href = a.getAttribute('href');
                                        if (!href || !href.includes('/web/dou/-/')) continue;
                                        const fullLink = href.startsWith('http') ? href : `https://www.in.gov.br${href}`;
                                        const rawTit = a.innerText || "";
                                        const tit = rawTit.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                                        const tipoAtoNome = extrairNomeTipoAto(tit);

                                        if (tit && !linksVistos.has(fullLink)) {
                                            linksVistos.add(fullLink);
                                            atosEncontrados.push({
                                                url: fullLink,
                                                titulo: tit,
                                                orgPrincipal: 'Não Identificado',
                                                orgSubordinada: '',
                                                tipoAtoNome: tipoAtoNome,
                                                selecionado: false,
                                                status: 'PENDENTE'
                                            });
                                            novos++;
                                        }
                                    }
                                }

                                if (novos === 0) continuar = false;
                                else pagina++;
                            } catch(e) {
                                continuar = false;
                            }
                            resolve();
                        },
                        onerror: () => { 
                            erroDetectadoServidor = true;
                            alert('⚠️ Falha de rede ao tentar conectar com a Imprensa Nacional (DOU).');
                            continuar = false; 
                            resolve(); 
                        }
                    });
                });
            }

            btnBuscar.innerHTML = '<span>🔍</span> <span>Buscar Atos no DOU</span>';
            btnBuscar.className = 'hud-btn hud-btn-primary';

            if (erroDetectadoServidor) {
                statusLabel.innerText = '❌ Servidor da Imprensa Nacional indisponível';
                return;
            }

            if (atosEncontrados.length === 0) {
                statusLabel.innerText = '❌ Nenhum ato encontrado.';
                alert(`Nenhum ato encontrado para ${partesData[2]}/${partesData[1]}/${partesData[0]}.`);
                return;
            }

            GM_setValue('dou_fila', JSON.stringify(atosEncontrados));
            GM_setValue('dou_index', 0);
            statusLabel.innerText = `${atosEncontrados.length} atos carregados. Marque os atos desejados.`;
            
            atualizarFiltrosCascata();
            renderizarListaAtos();
        };

        // --- EXPORTAR CSV ---
        const btnCsv = header.querySelector('#btn-export-csv');
        btnCsv.onclick = () => {
            const fila = JSON.parse(GM_getValue('dou_fila', '[]'));
            if (fila.length === 0) return alert('Nenhum dado na fila para exportar.');

            let csvContent = "data:text/csv;charset=utf-8,ID,Titulo,OrgPrincipal,OrgSubordinada,TipoAto,Status,Selecionado,Link\n";
            fila.forEach((it, idx) => {
                const titLimpo = `"${(it.titulo || '').replace(/"/g, '""')}"`;
                const orgPLimpo = `"${(it.orgPrincipal || '').replace(/"/g, '""')}"`;
                const orgSLimpo = `"${(it.orgSubordinada || '').replace(/"/g, '""')}"`;
                const tipoLimpo = `"${(it.tipoAtoNome || '').replace(/"/g, '""')}"`;
                csvContent += `${idx + 1},${titLimpo},${orgPLimpo},${orgSLimpo},${tipoLimpo},${it.status || 'PENDENTE'},${it.selecionado ? 'SIM' : 'NAO'},${it.url}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `relatorio_atos_${inputData.value}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // --- PROCESSAR ---
        btnIniciar.onclick = () => {
            const fila = JSON.parse(GM_getValue('dou_fila', '[]'));
            const pendentes = fila.filter(it => it.selecionado === true && it.status !== 'FEITO');
            if (pendentes.length === 0) return alert('Nenhum ato selecionado na fila. Marque pelo menos uma caixa.');

            sincronizarDicionarioNuvem(() => {
                GM_setValue('dou_ativo', true);
                processarProximoAto();
            });
        };

        btnPausar.onclick = () => {
            GM_setValue('dou_ativo', false);
            statusLabel.innerText = '⏸ Pausado pelo usuário';
        };

        btnLimpar.onclick = () => {
            GM_setValue('dou_ativo', false);
            GM_setValue('dou_fila', '[]');
            GM_setValue('dou_index', 0);
            statusLabel.innerText = 'Fila limpa';
            atualizarFiltrosCascata();
            renderizarListaAtos();
        };

        if (GM_getValue('dou_ativo', false)) {
            processarProximoAto();
        }
    }

    // =========================================================================
    // 11. MOTOR DE EXECUÇÃO
    // =========================================================================
    function processarProximoAto() {
        const fila = JSON.parse(GM_getValue('dou_fila', '[]'));
        const indexAtual = fila.findIndex(it => it.selecionado === true && it.status !== 'FEITO');
        const statusEl = document.getElementById('robo-status');

        if (indexAtual === -1) {
            GM_setValue('dou_ativo', false);
            if (statusEl) statusEl.innerText = '🎉 Todos os atos selecionados foram cadastrados!';
            alert('🎉 Concluído! Todos os atos selecionados foram cadastrados com sucesso.');
            return;
        }

        const atoAtual = fila[indexAtual];
        atoAtual.status = 'PROCESSANDO';
        GM_setValue('dou_fila', JSON.stringify(fila));

        if (statusEl) statusEl.innerText = `Processando ato #${indexAtual + 1}...`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: atoAtual.url,
            onload: function(res) {
                try {
                    const validacao = validarRespostaDOU(res);
                    if (!validacao.valido) {
                        atoAtual.status = 'ERRO: DOU Indisponível';
                        GM_setValue('dou_fila', JSON.stringify(fila));
                        GM_setValue('dou_ativo', false);
                        if (statusEl) statusEl.innerText = '❌ Imprensa Nacional (DOU) indisponível';
                        
                        alert(`⚠️ O site da Imprensa Nacional (DOU) está temporariamente indisponível ou instável no momento.\n\nDetalhes: ${validacao.erro}\n\nO processamento foi pausado.`);
                        return;
                    }

                    const dados = parseDOUHeadless(res.responseText);
                    GM_setValue('dou_ultimo_orgao_cru', dados.orgaoCru || '');
                    aplicarDadosNoFormulario(dados);

                    const modoPausa = GM_getValue('dou_modo_pausa', true);

                    if (modoPausa) {
                        atoAtual.status = 'FEITO';
                        GM_setValue('dou_fila', JSON.stringify(fila));
                        GM_setValue('dou_ativo', false);
                        if (statusEl) statusEl.innerText = `⏸ Pausado para conferência (#${indexAtual + 1}) - Pressione Alt + S`;
                        return;
                    }

                    if (statusEl) statusEl.innerText = `Salvando ato #${indexAtual + 1}...`;

                    setTimeout(() => {
                        if (!GM_getValue('dou_ativo', false)) return;

                        atoAtual.status = 'FEITO';
                        GM_setValue('dou_fila', JSON.stringify(fila));

                        const botoes = document.querySelectorAll('input[type="submit"], input[type="button"], button');
                        let btnSalvar = null;
                        for (let b = 0; b < botoes.length; b++) {
                            const val = botoes[b].value || botoes[b].innerText || "";
                            if (val === 'Salvar' || val === 'Salvar & Fechar') {
                                btnSalvar = botoes[b];
                                break;
                            }
                        }

                        if (btnSalvar) {
                            btnSalvar.click();
                        } else {
                            throw new Error('Botão Salvar não encontrado na página.');
                        }
                    }, 1800);

                } catch(err) {
                    atoAtual.status = 'ERRO: ' + err.message;
                    GM_setValue('dou_fila', JSON.stringify(fila));
                    GM_setValue('dou_ativo', false);
                    if (statusEl) statusEl.innerText = `❌ Erro no ato #${indexAtual + 1}: ${err.message}`;
                }
            },
            onerror: function() {
                atoAtual.status = 'ERRO: Falha de conexão';
                GM_setValue('dou_fila', JSON.stringify(fila));
                GM_setValue('dou_ativo', false);
                if (statusEl) statusEl.innerText = `❌ Falha ao baixar DOU do ato #${indexAtual + 1}`;
                alert('⚠️ Falha de rede ao tentar conectar com a Imprensa Nacional (DOU). O processamento foi interrompido.');
            }
        });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(iniciarPainelRobo, 500);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(iniciarPainelRobo, 500));
        window.addEventListener('load', () => setTimeout(iniciarPainelRobo, 500));
    }

})();
