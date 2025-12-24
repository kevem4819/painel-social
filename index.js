const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===== VALIDA VARIÁVEIS ===== */
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI não definida");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET não definido");
  process.exit(1);
}

/* ===== MONGODB ===== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch(err => {
    console.error("🔴 Erro MongoDB:", err);
    process.exit(1);
  });

/* ===== MODELS ===== */
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
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

/* ===== SESSÃO ===== */
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    },
  })
);

/* ===== HOME ===== */
app.get("/", async (req, res) => {
  if (!req.session.usuario) {
    return res.send(`
      <html>
      <body style="font-family:Arial;background:#111;color:white;">
        <div style="max-width:300px;margin:120px auto;">
          <h2>🚀 SocialPanel</h2>
          <form method="POST" action="/login">
            <input name="email" placeholder="Email" required /><br><br>
            <input name="senha" type="password" placeholder="Senha" required /><br><br>
            <button>Entrar</button>
          </form>
          <p><a href="/cadastro" style="color:#4CAF50">Criar conta</a></p>
        </div>
      </body>
      </html>
    `);
  }

  const posts = await Post.find({ usuario: req.session.usuario }).sort({ _id: -1 });

  res.send(`
    <html>
    <body style="font-family:Arial;background:#f4f6f8;padding:20px;">
      <h3>👤 ${req.session.usuario}</h3>

      <form method="POST" action="/postar">
        <input name="video" placeholder="Link do vídeo" required /><br><br>
        <label><input type="checkbox" name="tiktok"> TikTok</label><br>
        <label><input type="checkbox" name="instagram"> Instagram</label><br>
        <label><input type="checkbox" name="facebook"> Facebook</label><br><br>
        <button>POSTAR</button>
      </form>

      <form action="/logout" method="GET">
        <button>SAIR</button>
      </form>

      <h3>Histórico</h3>
      ${posts.map(p => `
        <div style="background:#fff;padding:10px;margin-bottom:10px;border-radius:5px;">
          <b>${p.data}</b><br>
          ${p.video}<br>
          ${p.redes.join(", ")}
        </div>
      `).join("")}
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
