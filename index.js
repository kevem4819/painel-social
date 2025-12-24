const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===== MONGODB (APENAS MONGOOSE) ===== */
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("🟢 MongoDB conectado (mongoose)"))
  .catch(err => {
    console.error("🔴 Erro MongoDB:", err.message);
    process.exit(1);
  });

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

/* ===== SESSÃO (FORMA MAIS ESTÁVEL) ===== */
app.use(
  session({
    name: "socialpanel.sid",
    secret: process.env.JWT_SECRET || "segredo123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // 👈 ESSENCIAL
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

/* ===== HOME ===== */
app.get("/", async (req, res) => {
  if (!req.session.usuario) {
    return res.send(`
      <html>
        <body style="background:#111;color:white;font-family:Arial">
          <div style="max-width:300px;margin:120px auto">
            <h2>🚀 SocialPanel</h2>
            <form method="POST" action="/login">
              <input name="email" placeholder="Email" required /><br><br>
              <input name="senha" type="password" placeholder="Senha" required /><br><br>
              <button>Entrar</button>
            </form>
            <a href="/cadastro">Criar conta</a>
          </div>
        </body>
      </html>
    `);
  }

  const posts = await Post.find({ usuario: req.session.usuario });

  res.send(`
    <html>
      <body style="font-family:Arial">
        <h2>👤 ${req.session.usuario}</h2>
        <form action="/logout"><button>Sair</button></form>

        <h3>Nova postagem</h3>
        <form method="POST" action="/postar">
          <input name="video" placeholder="Link do vídeo" required /><br>
          <label><input type="checkbox" name="tiktok"> TikTok</label>
          <label><input type="checkbox" name="instagram"> Instagram</label>
          <label><input type="checkbox" name="facebook"> Facebook</label><br>
          <button>Postar</button>
        </form>

        <h3>Histórico</h3>
        ${posts
          .map(
            p => `
            <div>
              <b>${p.data}</b><br>
              ${p.video}<br>
              ${p.redes.join(", ")}
            </div><hr>
          `
          )
          .reverse()
          .join("")}
      </body>
    </html>
  `);
});

/* ===== CADASTRO ===== */
app.get("/cadastro", (req, res) => {
  res.send(`
    <form method="POST">
      <input name="email" placeholder="Email" required />
      <input name="senha" type="password" placeholder="Senha" required />
      <button>Cadastrar</button>
    </form>
  `);
});

app.post("/cadastro", async (req, res) => {
  const { email, senha } = req.body;
  if (await User.findOne({ email })) return res.send("Usuário já existe");
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
