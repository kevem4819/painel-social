const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===== MONGODB ===== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch(err => console.error("🔴 Erro MongoDB:", err));

/* ===== MODELS ===== */
const UserSchema = new mongoose.Schema({
  email: String,
  senha: String,
});

const PostSchema = new mongoose.Schema({
  usuario: String,
  video: String,
  redes: [String],
  data: String,
});

const User = mongoose.model("User", UserSchema);
const Post = mongoose.model("Post", PostSchema);

/* ===== SESSÃO (CORRIGIDA) ===== */
app.use(
  session({
    secret: process.env.JWT_SECRET || "segredo123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore({
      mongoUrl: process.env.MONGO_URI,
    }),
  })
);

/* ===== HOME ===== */
app.get("/", async (req, res) => {
  if (!req.session.usuario) {
    return res.send(`
      <html>
        <head>
          <title>SocialPanel</title>
          <style>
            body { font-family: Arial; background:#111; color:white; }
            .box {
              background:#1c1c1c;
              padding:30px;
              max-width:320px;
              margin:120px auto;
              border-radius:10px;
            }
            input, button {
              width:100%;
              padding:12px;
              margin-top:12px;
              border-radius:6px;
              border:none;
            }
            button {
              background:#4CAF50;
              color:white;
              font-weight:bold;
              cursor:pointer;
            }
            a { color:#4CAF50; text-decoration:none; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>🚀 SocialPanel</h2>
            <form method="POST" action="/login">
              <input name="email" placeholder="Email" required />
              <input name="senha" type="password" placeholder="Senha" required />
              <button>Entrar</button>
            </form>
            <p><a href="/cadastro">Criar conta</a></p>
          </div>
        </body>
      </html>
    `);
  }

  const posts = await Post.find({ usuario: req.session.usuario });

  res.send(`
    <html>
      <head>
        <title>Painel</title>
        <style>
          body { margin:0; font-family:Arial; background:#f4f6f8; }
          header {
            background:#111;
            color:white;
            padding:15px;
            display:flex;
            justify-content:space-between;
            align-items:center;
          }
          .container {
            padding:30px;
            max-width:700px;
            margin:auto;
          }
          .box {
            background:white;
            padding:20px;
            border-radius:8px;
            margin-bottom:20px;
            box-shadow:0 0 10px rgba(0,0,0,.05);
          }
          input, button {
            width:100%;
            padding:12px;
            margin-top:10px;
          }
          button {
            background:#111;
            color:white;
            border:none;
            cursor:pointer;
          }
          .item {
            background:#eee;
            padding:10px;
            border-radius:5px;
            margin-top:10px;
            font-size:14px;
          }
        </style>
      </head>

      <body>
        <header>
          <div>👤 ${req.session.usuario}</div>
          <form action="/logout"><button>SAIR</button></form>
        </header>

        <div class="container">
          <div class="box">
            <h3>Nova postagem</h3>
            <form method="POST" action="/postar">
              <input name="video" placeholder="Link do vídeo" required />

              <label><input type="checkbox" name="tiktok"> TikTok</label><br>
              <label><input type="checkbox" name="instagram"> Instagram</label><br>
              <label><input type="checkbox" name="facebook"> Facebook</label><br>

              <button>POSTAR</button>
            </form>
          </div>

          <div class="box">
            <h3>Histórico</h3>
            ${posts.map(p => `
              <div class="item">
                <b>${p.data}</b><br>
                ${p.video}<br>
                ${p.redes.join(", ")}
              </div>
            `).reverse().join("")}
          </div>
        </div>
      </body>
    </html>
  `);
});

/* ===== CADASTRO ===== */
app.get("/cadastro", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:Arial;background:#111;color:white;">
        <div style="max-width:300px;margin:120px auto;">
          <h2>Criar conta</h2>
          <form method="POST" action="/cadastro">
            <input name="email" placeholder="Email" required /><br><br>
            <input name="senha" type="password" placeholder="Senha" required /><br><br>
            <button>Cadastrar</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post("/cadastro", async (req, res) => {
  const { email, senha } = req.body;

  const existe = await User.findOne({ email });
  if (existe) return res.send("Usuário já existe");

  await User.create({ email, senha });
  res.redirect("/");
});

/* ===== LOGIN ===== */
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  // Admin
  if (
    email === process.env.ADMIN_EMAIL &&
    senha === process.env.ADMIN_PASSWORD
  ) {
    req.session.usuario = email;
    return res.redirect("/");
  }

  const user = await User.findOne({ email, senha });
  if (!user) return res.send("Login inválido");

  req.session.usuario = email;
  res.redirect("/");
});

/* ===== LOGOUT ===== */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ===== POSTAR ===== */
app.post("/postar", async (req, res) => {
  if (!req.session.usuario) return res.redirect("/");

  const redes = [];
  if (req.body.tiktok) redes.push("TikTok");
  if (req.body.instagram) redes.push("Instagram");
  if (req.body.facebook) redes.push("Facebook");

  await Post.create({
    usuario: req.session.usuario,
    video: req.body.video,
    redes,
    data: new Date().toLocaleString(),
  });

  res.redirect("/");
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🟢 SocialPanel rodando");
});
