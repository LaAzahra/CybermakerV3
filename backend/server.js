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

try {
  console.log("🌍 Conectando ao MySQL do Railway...");
    
    // Configuração corrigida para usar process.env.MYSQL_PREFIXOS (com underline)
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST, 
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE, 
        port: Number(process.env.MYSQL_PORT), 
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10
    });

} catch (err) {
  console.error("❌ ERRO FATAL no MySQL:", err); // Mantém o log de erro completo
  // Removido process.exit(1) aqui para evitar crash loop no deploy
}

// Teste de Conexão Assíncrona (Acontece após o servidor iniciar)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL conectado");
    conn.release();
  } catch (err) {
    // Este erro será exibido se a conexão falhar após a inicialização do pool
    console.error("❌ ERRO MySQL no Teste de Conexão:", err.message);
  }
})();

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