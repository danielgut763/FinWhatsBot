import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";

const ano = "2026";
const DATA_DIR = "/data";
const AUTH_DIR = "/data/auth";
const DADOS_PATH = "/data/dados.json";

// -------------------------------------
//   GARANTIR QUE /data EXISTE
// -------------------------------------
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR);
}

// -------------------------------------
//  SE /data/dados.json NÃO EXISTIR,
//  COPIA O dados.json LOCAL
// -------------------------------------
if (!fs.existsSync(DADOS_PATH)) {
    console.log("Criando /data/dados.json a partir do arquivo local...");
    fs.copyFileSync("./dados.json", DADOS_PATH);
}

let dados = JSON.parse(fs.readFileSync(DADOS_PATH));

function salvar() {
    fs.writeFileSync(DADOS_PATH, JSON.stringify(dados, null, 2));
}

function getMesAtual() {
    const hoje = new Date();
    return String(hoje.getMonth() + 1).padStart(2, "0");
}

// -------------------------------------
//               BOT
// -------------------------------------
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false
    });

    // QR CODE
    sock.ev.on("connection.update", ({ connection, qr }) => {
        if (qr) {
            console.log("Escaneie o QR:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") console.log("Bot conectado!");
        if (connection === "close") console.log("Conexão encerrada. Railway vai reiniciar automaticamente.");
    });

    sock.ev.on("creds.update", saveCreds);

    // -------------------------------------
    //        PROCESSAR MENSAGENS
    // -------------------------------------
    sock.ev.on("messages.upsert", async (msg) => {
        const m = msg.messages[0];
        if (!m.message) return;

        const texto = m.message.conversation || "";
        const chat = m.key.remoteJid;

        const mes = getMesAtual();

        if (!dados[ano][mes]) {
            dados[ano][mes] = { categorias: {}, parcelas: [] };
        }

        console.log("Mensagem:", texto);

        // MENU
        if (texto.toLowerCase() === "menu") {
            await sock.sendMessage(chat, {
                text:
`📌 *MENU FINANCEIRO 2026*

1️⃣ Ver gastos do mês  
2️⃣ Ver limites  
3️⃣ Ver parcelas  
4️⃣ Registrar gasto: 30-uber  
5️⃣ Registrar parcelado: 30-roupa-5x  
6️⃣ Editar limite: limite-uber-500`
            });
            return;
        }

        // Ver gastos
        if (texto === "1") {
            const categorias = dados[ano][mes].categorias;
            if (Object.keys(categorias).length === 0)
                return sock.sendMessage(chat, { text: "Nenhum gasto registrado." });

            let resp = "📊 *Gastos do mês*\n\n";
            for (let cat in categorias) {
                resp += `• ${cat}: R$${categorias[cat].gasto}\n`;
            }

            return sock.sendMessage(chat, { text: resp });
        }

        // Ver limites
        if (texto === "2") {
            const categorias = dados[ano][mes].categorias;

            let resp = "🎯 *Limites*\n\n";
            for (let cat in categorias) {
                resp += `• ${cat}: R$${categorias[cat].limite || 0}\n`;
            }

            return sock.sendMessage(chat, { text: resp });
        }

        // Ver parcelas
        if (texto === "3") {
            const parcelas = dados[ano][mes].parcelas;

            if (parcelas.length === 0)
                return sock.sendMessage(chat, { text: "Nenhuma parcela ativa." });

            let resp = "📆 *Parcelas*\n\n";
            parcelas.forEach(p => {
                resp += `• ${p.categoria}: R$${p.valor} (${p.meses_restantes} meses restantes)\n`;
            });

            return sock.sendMessage(chat, { text: resp });
        }

        // Editar limite
        let editar = texto.match(/^limite-([a-zA-Z]+)-(\d+)$/);
        if (editar) {
            let cat = editar[1];
            let valor = parseInt(editar[2]);

            if (!dados[ano][mes].categorias[cat])
                dados[ano][mes].categorias[cat] = { gasto: 0, limite: 0 };

            dados[ano][mes].categorias[cat].limite = valor;
            salvar();

            return sock.sendMessage(chat, { text: `Limite de ${cat} atualizado para R$${valor}.` });
        }

        // Gasto simples (30-uber)
        let simples = texto.match(/^(\d+)-([a-zA-Z]+)$/);
        if (simples) {
            let valor = parseInt(simples[1]);
            let cat = simples[2];

            if (!dados[ano][mes].categorias[cat])
                dados[ano][mes].categorias[cat] = { gasto: 0, limite: 0 };

            dados[ano][mes].categorias[cat].gasto += valor;
            salvar();

            return sock.sendMessage(chat, { text: `Registrado: R$${valor} em ${cat}` });
        }

        // Gasto parcelado (30-roupa-5x)
        let parcelado = texto.match(/^(\d+)-([a-zA-Z]+)-(\d+)x$/);
        if (parcelado) {
            let valor = parseInt(parcelado[1]);
            let cat = parcelado[2];
            let vezes = parseInt(parcelado[3]);

            if (!dados[ano][mes].categorias[cat])
                dados[ano][mes].categorias[cat] = { gasto: 0, limite: 0 };

            dados[ano][mes].categorias[cat].gasto += valor;

            dados[ano][mes].parcelas.push({
                categoria: cat,
                valor,
                meses_restantes: vezes
            });

            salvar();

            return sock.sendMessage(chat, { text: `Registrado: ${vezes}x de R$${valor} em ${cat}.` });
        }
    });
}

startBot();
