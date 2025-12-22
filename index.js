const express = require("express");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===== "BANCO DE DADOS" EM MEMÓRIA ===== */
const usuarios = [];
const historico = {};
let usuarioLogado = null;

/* ===== PÁGINA INICIAL ===== */
app.get("/", (req, res) => {
  if (!usuarioLogado) {
    return res.send(`
      <html>
        <head>
          <title>SocialPanel</title>
          <style>
            body { font-family: Arial; background: #111; color: white; }
            .box {
              background: #1c1c1c;
              padding: 30px;
              max-width: 320px;
              margin: 120px auto;
              border-radius: 10px;
            }
            input, button {
              width: 100%;
              padding: 12px;
              margin-top: 12px;
              border-radius: 6px;
              border: none;
            }
            button {
              background: #4CAF50;
              color: white;
              font-weight: bold;
              cursor: pointer;
            }
            a { color: #4CAF50; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>🚀 SocialPanel</h2>
            <form method="POST" action="/login">
              <input name="email" placeholder="Email" />
              <input name="senha" type="password" placeholder="Senha" />
              <button>Entrar</button>
            </form>
            <p><a href="/cadastro">Criar conta</a></p>
          </div>
        </body>
      </html>
    `);
  }

  /* ===== PAINEL ===== */
  res.send(`
    <html>
      <head>
        <title>Painel</title>
        <style>
          body { margin: 0; font-family: Arial; background: #f4f6f8; }
          header {
            background: #111;
            color: white;
            padding: 15px;
            font-size: 20px;
          }
          .container {
            padding: 30px;
            max-width: 600px;
            margin: auto;
          }
          .box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          input, button {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
          }
          button {
            background: #111;
            color: white;
            border: none;
            cursor: pointer;
          }
          .item {
            background: #eee;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 14px;
          }
        </style>
      </head>

      <body>
        <header>👤 ${usuarioLogado}</header>

        <div class="container">
          <div class="box">
            <h3>Nova postagem</h3>

            <input id="video" placeholder="Link do vídeo" />

            <label><input type="checkbox" id="tiktok"> TikTok</label><br>
            <label><input type="checkbox" id="instagram"> Instagram</label><br>
            <label><input type="checkbox" id="facebook"> Facebook</label><br>

            <button onclick="postar()">POSTAR</button>
            <button onclick="logout()">SAIR</button>
          </div>

          <div class="box">
            <h3>Histórico</h3>
            <div id="historico"></div>
          </div>
        </div>

        <script>
          function postar() {
            fetch("/postar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                video: document.getElementById("video").value,
                tiktok: document.getElementById("tiktok").checked,
                instagram: document.getElementById("instagram").checked,
                facebook: document.getElementById("facebook").checked
              })
            }).then(() => carregar());
          }

          function carregar() {
            fetch("/historico")
              .then(r => r.json())
              .then(h => {
                document.getElementById("historico").innerHTML =
                  h.map(i =>
                    \`<div class="item">
                      <b>\${i.data}</b><br>
                      \${i.video}<br>
                      \${i.redes.join(", ")}
                    </div>\`
                  ).reverse().join("");
              });
          }

          function logout() {
            fetch("/logout").then(() => location.reload());
          }

          carregar();
        </script>
      </body>
    </html>
  `);
});

/* ===== CADASTRO ===== */
app.get("/cadastro", (req, res) => {
  res.send(`
    <html>
      <head><title>Cadastro</title></head>
      <body style="font-family: Arial; background:#111; color:white;">
        <div style="max-width:300px;margin:120px auto;">
          <h2>Criar conta</h2>
          <form method="POST" action="/cadastro">
            <input name="email" placeholder="Email" /><br><br>
            <input name="senha" type="password" placeholder="Senha" /><br><br>
            <button>Cadastrar</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post("/cadastro", (req, res) => {
  const email = req.body.email.trim();
  const senha = req.body.senha.trim();

  if (usuarios.find(u => u.email === email)) {
    return res.send("Usuário já existe");
  }

  usuarios.push({ email, senha });
  historico[email] = [];
  res.redirect("/");
});

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  const email = req.body.email.trim();
  const senha = req.body.senha.trim();

  const user = usuarios.find(
    u => u.email === email && u.senha === senha
  );

  if (!user) return res.send("Login inválido");

  usuarioLogado = email;
  res.redirect("/");
});

/* ===== LOGOUT ===== */
app.get("/logout", (req, res) => {
  usuarioLogado = null;
  res.redirect("/");
});

/* ===== POSTAGEM ===== */
app.post("/postar", (req, res) => {
  if (!usuarioLogado) return res.status(401).end();

  const redes = [];
  if (req.body.tiktok) redes.push("TikTok");
  if (req.body.instagram) redes.push("Instagram");
  if (req.body.facebook) redes.push("Facebook");

  historico[usuarioLogado].push({
    data: new Date().toLocaleString(),
    video: req.body.video,
    redes
  });

  res.json({ ok: true });
});

/* ===== HISTÓRICO ===== */
app.get("/historico", (req, res) => {
  if (!usuarioLogado) return res.status(401).end();
  res.json(historico[usuarioLogado]);
});

app.listen(3000, () => {
  console.log("🟢 SocialPanel com múltiplos usuários");
});
