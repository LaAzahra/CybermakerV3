import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ================================
   MIDDLEWARES
================================ */

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.get("/", (req, res) => res.send("OK"));

/* ================================
   CONEXÃO COM MYSQL (CORRIGIDA)
================================ */

let pool;

try {

  if (process.env.DATABASE_URL) {

    console.log("🌍 Usando DATABASE_URL (Railway)");

    const dbUrl = new URL(process.env.DATABASE_URL);

    pool = mysql.createPool({
      host: dbUrl.hostname,
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.replace("/", ""),
      port: Number(dbUrl.port) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
    });

  } else {

    console.log("💻 Usando variáveis DB_*");

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT),
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

} catch (err) {
  console.error("❌ ERRO AO CONFIGURAR O BANCO:", err);
}

/* ================================
   TESTE DE CONEXÃO
================================ */

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MYSQL CONECTADO COM SUCESSO!");
    conn.release();
  } catch (err) {
    console.error("❌ ERRO DE CONEXÃO COM MYSQL:");
    console.error(err);
  }
})();

/* ================================
   SERVIR FRONTEND
================================ */

app.use(express.static(path.join(__dirname)));

/* ================================
   ROTAS API
================================ */

app.get("/api/ping", (req, res) => res.json({ ok: true }));

// REGISTRO
app.post("/api/registrar", async (req, res) => {
  const { nome, email, senha, foto, tipo_usuario } = req.body;

  if (!nome || !email || !senha || !tipo_usuario)
    return res.status(400).json({ success: false, error: "Campos obrigatórios faltando." });

  try {
    const [rows] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length) return res.status(400).json({ success: false, error: "Email já registrado." });

    const hash = await bcrypt.hash(senha, 10);
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(`
      INSERT INTO usuarios 
      (nome, email, senha, foto, pontos, online, tipo_usuario, confirmado, token_confirmacao)
      VALUES (?, ?, ?, ?, 0, FALSE, ?, FALSE, ?)
    `, [nome, email, hash, foto || null, tipo_usuario, token]);

    res.json({ success: true, message: "Conta criada. Confirme por e-mail." });

  } catch (err) {
    console.error("❌ REGISTRO:", err);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  try {

    const [rows] = await pool.query(
      "SELECT id, nome, email, senha, foto, pontos, confirmado, tipo_usuario FROM usuarios WHERE email = ?",
      [email]
    );

    if (!rows.length) return res.status(400).json({ success: false, error: "Credenciais inválidas" });

    const usuario = rows[0];

    const ok = await bcrypt.compare(senha, usuario.senha);
    if (!ok) return res.status(400).json({ success: false, error: "Credenciais inválidas" });

    if (!usuario.confirmado)
      return res.status(403).json({ success: false, error: "Email não confirmado" });

    delete usuario.senha;

    res.json({ success: true, usuario, tipo_usuario: usuario.tipo_usuario });

  } catch (err) {
    console.error("❌ LOGIN:", err);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// CONFIRMAR EMAIL
app.get("/api/confirmar/:token", async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE usuarios SET confirmado = TRUE, token_confirmacao = NULL WHERE token_confirmacao = ?",
      [req.params.token]
    );

    if (!result.affectedRows)
      return res.status(400).send("Token inválido.");

    res.redirect(`${process.env.FRONTEND_URL || "/"}login.html`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao confirmar conta.");
  }
});

// LISTAR DESAFIOS
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
    console.error(err);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// POSTAR DESAFIOS
app.post("/api/desafios", async (req, res) => {
  const { recrutador_id, titulo, descricao, area } = req.body;

  try {
    const [[user]] = await pool.query("SELECT tipo_usuario FROM usuarios WHERE id = ?", [recrutador_id]);

    if (!user || user.tipo_usuario !== "recrutador")
      return res.status(403).json({ error: "Apenas recrutadores." });

    await pool.query(
      "INSERT INTO desafios (recrutador_id, titulo, descricao, area) VALUES (?, ?, ?, ?)",
      [recrutador_id, titulo, descricao, area]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao postar" });
  }
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});
