const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const app = express();

// 🔴 ESSA LINHA É OBRIGATÓRIA NO RENDER
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  senha: String, // hash bcrypt
});

const PostSchema = new mongoose.Schema({
  usuario: String,
  video: String,
  redes: [String],
  data: String,
});

const User = mongoose.model("User", UserSchema);
const Post = mongoose.model("Post", PostSchema);

/* ===== SESSÃO (SEGURA) ===== */
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
    sameSite: "none",
    secure: true,
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
            <p><a href="/cadastro">Criar conta</a></p>
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
  <style>
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #0f172a;
      color: #e5e7eb;
    }

    header {
      background: #020617;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
    }

    header h2 {
      margin: 0;
      color: #22c55e;
    }

    .logout {
      background: #dc2626;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-weight: bold;
    }

    .container {
      max-width: 900px;
      margin: 30px auto;
      padding: 0 20px;
    }

    .card {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
    }

    .card h3 {
      margin-top: 0;
      color: #38bdf8;
    }

    input[type="text"] {
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      border: none;
      margin-bottom: 15px;
      font-size: 15px;
    }

    .checkboxes label {
      display: block;
      margin-bottom: 8px;
      cursor: pointer;
    }

    .postar {
      margin-top: 15px;
      background: #22c55e;
      border: none;
      padding: 14px;
      width: 100%;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      color: #022c22;
    }

    .item {
      background: #020617;
      border: 1px solid #1e293b;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 14px;
    }

    .item span {
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>

<body>
  <header>
    <h2>🚀 SocialPanel</h2>
    <form action="/logout" method="GET">
      <button class="logout">Sair</button>
    </form>
  </header>

  <div class="container">

    <div class="card">
      <h3>Nova postagem</h3>
      <form method="POST" action="/postar">
        <input type="text" name="video" placeholder="Link do vídeo" required>

        <div class="checkboxes">
          <label><input type="checkbox" name="tiktok"> TikTok</label>
          <label><input type="checkbox" name="instagram"> Instagram</label>
          <label><input type="checkbox" name="facebook"> Facebook</label>
        </div>

        <button class="postar">Postar</button>
      </form>
    </div>

    <div class="card">
      <h3>Histórico</h3>
      ${
        posts.map(p => `
          <div class="item">
            <span>${p.data}</span><br>
            ${p.video}<br>
            ${p.redes.join(", ")}
          </div>
        `).reverse().join("")
      }
    </div>

  </div>
</body>
</html>
`);


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
