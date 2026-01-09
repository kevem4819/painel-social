const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const app = express();

// 🔴 ESSA LINHA É OBRIGATÓRIA NO RENDER
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===== MONGODB ===== */
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch(err => console.error("🔴 Erro MongoDB:", err.message));

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

/* ===== SESSÃO (CORRIGIDA) ===== */
app.use(
  session({
    name: "socialpanel.sid",
    secret: process.env.JWT_SECRET || "segredo123",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "none", // ✅ OBRIGATÓRIO
      secure: true,     // ✅ OBRIGATÓRIO NO RENDER
    },
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
          </div>
        </body>
      </html>
    `);
  }

  const posts = await Post.find({ usuario: req.session.usuario });

  res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>SocialPanel</title>
</head>
<body>
  <h2>🚀 SocialPanel</h2>
  <form action="/logout" method="GET">
    <button>Sair</button>
  </form>

  <form method="POST" action="/postar">
    <input name="video" placeholder="Link do vídeo" required />
    <label><input type="checkbox" name="tiktok"> TikTok</label>
    <label><input type="checkbox" name="instagram"> Instagram</label>
    <label><input type="checkbox" name="facebook"> Facebook</label>
    <button>Postar</button>
  </form>

  <hr/>

  ${posts.map(p => `
    <div>
      <strong>${p.data}</strong><br/>
      ${p.video}<br/>
      ${p.redes.join(", ")}
    </div>
  `).join("")}
</body>
</html>
`);
});

/* ===== LOGIN ===== */
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    senha === process.env.ADMIN_PASSWORD
  ) {
    req.session.usuario = email;
    return req.session.save(() => res.redirect("/"));
  }

  const user = await User.findOne({ email, senha });
  if (!user) return res.send("Login inválido");

  req.session.usuario = email;
  req.session.save(() => res.redirect("/"));
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
