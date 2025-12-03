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
// ================================
// FRONTEND (Caminho Corrigido)
// ================================
// '..' sobe do backend/ para a raiz e acessa frontend/
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ================================
// ROTAS API (CORRETAS)
// ... Todas as suas rotas /api/ estão corretas ...
// ================================

// ... SEU CÓDIGO DE ROTAS AQUI ...

// ================================
// CATCH-ALL CORRETO (Caminho Corrigido para SPA)
// ================================
app.get("*", (req, res) => {
  // Caminho corrigido: sobe, vai para frontend/, depois para html/, e pega index.html
  res.sendFile(path.join(__dirname, "..", "frontend", "html", "index.html"));
});

// ================================
// INICIAR SERVIDOR (Caminho e Bind Corretos)
// ================================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Garante o bind correto no container

app.listen(PORT, HOST, () => console.log(`🚀 Rodando em http://${HOST}:${PORT}`));