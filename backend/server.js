import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// ================================
// CONFIG PATHS
// ================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ================================
// MIDDLEWARES
// ================================
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ================================
// CONEXÃO MYSQL RAILWAY
// ================================
let pool;

if (process.env.DB_POST) {
  console.log("🌍 Usando variável DB_POST para conexão ao banco do Railway!");

  try {
    const dbUrl = new URL(process.env.DB_POST);

    pool = mysql.createPool({
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace("/", ""),
      port: Number(dbUrl.port) || 51980,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  } catch (err) {
    console.error("❌ Erro ao interpretar DB_POST:", err);
  }
} else {
  console.log("💻 Usando variáveis locais para conexão ao banco!");

  const DB_HOST = process.env.DB_HOST || "localhost";
  const DB_USER = process.env.DB_USER || "root";
  const DB_PASSWORD = process.env.DB_PASSWORD || "Automata";
  const DB_NAME = process.env.DB_NAME || "CyberMaker";

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: 53816,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

// Teste de Conexão Assíncrona (Health Check do Banco)
(async () => {
  try {
    // Tenta obter uma conexão para confirmar que o pool está funcionando
    const conn = await pool.getConnection();
    console.log("✅ MySQL conectado com sucesso.");
    conn.release();
  } catch (err) {
    // Este erro é crucial: Ele expõe o erro de credencial se a conexão falhar
    console.error("❌ ERRO MySQL no Teste de Conexão:", err);
  }
})();


// ================================
// FRONTEND (Caminho Corrigido)
// ================================
// '..' sobe do backend/ para a raiz e acessa frontend/
app.use(express.static(path.join(__dirname,"frontend")));


// ================================
// ROTAS API (CORPO)
// ================================

// Rota de Teste de Conexão (Ping)
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Rota de Registro (Exemplo Mínimo)
app.post("/api/registrar", async (req, res) => {
    const { nome, email, senha, tipo_usuario } = req.body;

    if (!nome || !email || !senha || !tipo_usuario) {
        return res.status(400).json({ success: false, error: "Campos obrigatórios faltando." });
    }

    try {
        const hash = await bcrypt.hash(senha, 10);
        const token = crypto.randomBytes(32).toString("hex");

        await pool.query(`
            INSERT INTO usuarios
            (nome, email, senha, foto, pontos, online, tipo_usuario, confirmado, token_confirmacao)
            VALUES (?, ?, ?, NULL, 0, FALSE, ?, FALSE, ?)
        `, [nome, email, hash, tipo_usuario, token]);

        res.json({ success: true, message: "Conta criada. Confirme por e-mail." });

    } catch (err) {
        console.error("❌ ERRO REGISTRO:", err.message);
        res.status(500).json({ success: false, error: "Erro interno" });
    }
});

// ... Inclua todas as suas outras rotas (/api/login, /api/desafios, etc.) aqui.


// ================================
// CATCH-ALL CORRETO (Caminho Corrigido para SPA)
// ================================
app.get("*", (req, res) => { 
    // CORREÇÃO FINAL: Aponta para 'frontend/index.html' (assumindo que o arquivo não está em 'html/')
    res.sendFile(path.join(__dirname,"frontend", "index.html")); 
});

// ================================
// INICIAR SERVIDOR (Caminho e Bind Corretos)
// ================================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Garante o bind correto no container

app.listen(PORT, HOST, () => console.log(`🚀 Rodando em http://${HOST}:${PORT}`));