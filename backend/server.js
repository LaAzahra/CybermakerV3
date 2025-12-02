import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ======================
// CONEXÃO MYSQL RAILWAY
// ======================

let pool;

try {
  console.log("🔌 Conectando ao MySQL da Railway...");

  pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
  });

  console.log("✅ MySQL conectado!");
} catch (err) {
  console.error("❌ ERRO MySQL:", err);
}

// ======================
// ROTAS
// ======================

app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email=? AND senha=?",
      [email, senha]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    res.json({ success: true, user: rows[0] });

  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/registrar", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
      [nome, email, senha]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ======================
// START SERVER
// ======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
