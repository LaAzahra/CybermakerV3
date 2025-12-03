import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// ================================
// CONFIG PATH
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
// ================================
// CONEXÃO MYSQL RAILWAY
// ================================
let pool;

try {
  console.log("🌍 Conectando ao MySQL do Railway...");
pool = mysql.createPool({
  host: process.env.MYSQL_HOST,      // MUDANÇA AQUI
  user: process.env.MYSQL_USER,      // MUDANÇA AQUI
  password: process.env.MYSQL_PASSWORD, // MUDANÇA AQUI
  database: process.env.MYSQL_DATABASE, // MUDANÇA AQUI
  port: Number(process.env.MYSQL_PORT),  // MUDANÇA AQUI
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
  });

} catch (err) {
  console.error("❌ ERRO FATAL no MySQL:", err); // Passe o objeto err diretamente
  process.exit(1);
}

// Teste
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL conectado");
    conn.release();
  } catch (err) {
    console.error("❌ ERRO MySQL:", err.message);
  }
})();

// ================================
// FRONTEND
// ================================
app.use(express.static(path.join(__dirname, "frontend")));

// ================================
// ROTAS API
// ================================

app.get("/api/ping", (req, res) => res.json({ ok: true }));

// REGISTRO
app.post("/api/registrar", async (req, res) => {
  const { nome, email, senha, foto, tipo_usuario } = req.body;

  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios faltando." });
  }

  try {
    const [rows] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length)
      return res.status(400).json({ success: false, error: "Email já registrado." });

    const hash = await bcrypt.hash(senha, 10);
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(`
      INSERT INTO usuarios
      (nome, email, senha, foto, pontos, online, tipo_usuario, confirmado, token_confirmacao)
      VALUES (?, ?, ?, ?, 0, FALSE, ?, FALSE, ?)
    `, [nome, email, hash, foto || null, tipo_usuario, token]);

    res.json({ success: true, message: "Conta criada. Confirme por e-mail." });

  } catch (err) {
    console.error("❌ REGISTRO:", err.message);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [rows] = await pool.query(`
      SELECT id, nome, email, senha, foto, pontos, confirmado, tipo_usuario
      FROM usuarios
      WHERE email = ?
    `, [email]);

    if (!rows.length)
      return res.status(400).json({ success: false, error: "Credenciais inválidas" });

    const usuario = rows[0];

    const ok = await bcrypt.compare(senha, usuario.senha);
    if (!ok)
      return res.status(400).json({ success: false, error: "Credenciais inválidas" });

    if (!usuario.confirmado)
      return res.status(403).json({ success: false, error: "Email não confirmado" });

    delete usuario.senha;
    res.json({ success: true, usuario });

  } catch (err) {
    console.error("❌ LOGIN:", err.message);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// CONFIRMAR
app.get("/api/confirmar/:token", async (req, res) => {
  try {
    const [result] = await pool.query(`
      UPDATE usuarios
      SET confirmado = TRUE, token_confirmacao = NULL
      WHERE token_confirmacao = ?
    `, [req.params.token]);

    if (!result.affectedRows)
      return res.status(400).send("Token inválido.");

    res.redirect("/html/login.html");

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erro ao confirmar conta.");
  }
});

// DESAFIOS
app.get("/api/desafios", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.id, d.titulo, d.descricao, d.area, d.data_postagem,
      u.nome AS nome_recrutador
      FROM desafios d
      JOIN usuarios u ON d.recrutador_id = u.id
      ORDER BY d.data_postagem DESC
    `);

    res.json({ success: true, desafios: rows });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// POSTAR DESAFIO
app.post("/api/desafios", async (req, res) => {
  const { recrutador_id, titulo, descricao, area } = req.body;

  try {
    const [[user]] = await pool.query(
      "SELECT tipo_usuario FROM usuarios WHERE id = ?",
      [recrutador_id]
    );

    if (!user || user.tipo_usuario !== "recrutador")
      return res.status(403).json({ error: "Apenas recrutadores." });

    await pool.query(
      "INSERT INTO desafios (recrutador_id, titulo, descricao, area) VALUES (?, ?, ?, ?)",
      [recrutador_id, titulo, descricao, area]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao postar" });
  }
});

// ================================
// CATCH-ALL CORRETO
// ================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// ================================
// INICIAR SERVIDOR
// ================================
const PORT = process.env.PORT || 3000;

// MUDANÇA: Adicionar '0.0.0.0' para garantir que ele se ligue corretamente à interface do contêiner.
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Rodando na porta ${PORT}`));