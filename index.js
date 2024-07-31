const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");
const { body, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");
const fs = require("fs");

const app = express();

dotenv.config();

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "chave-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 },
  })
);

app.use(express.static(path.join(__dirname, "public")));

function authVerify(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.get("/", (req, res) => {
  fs.readdir(path.join(__dirname, "pages"), (err, files) => {
    if (err) {
      return res.status(500).send("Erro ao ler as páginas");
    }

    const pages = files.map((file) => {
      const name = path.basename(file, ".txt");
      return { url: `/pages/${name}`, name };
    });

    const content =
      pages.length > 0 ? "Páginas criadas:" : "Nenhuma página criada";
    res.render("home", { pages, content });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username é obrigatório"),
    body("password").trim().notEmpty().withMessage("Password é obrigatório"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("login", { errors: errors.array() });
    }

    const { username, password } = req.body;
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      req.session.loggedIn = true;
      res.cookie("loggedIn", true, { maxAge: 60000 });
      return res.redirect("/admin");
    } else {
      return res.status(401).send("Usuário ou senha incorretos");
    }
  }
);

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("loggedIn");
  res.redirect("/login");
});

app.get("/admin", authVerify, (req, res) => {
  res.render("admin");
});

app.get("/admin/create", authVerify, (req, res) => {
  res.render("create");
});

app.post(
  "/admin/create",
  authVerify,
  [
    body("url")
      .trim()
      .notEmpty()
      .withMessage("É necessário preencher o campo de URL"),
    body("content")
      .trim()
      .notEmpty()
      .withMessage("É necessário preencher o campo de Conteúdo"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("create", { errors: errors.array() });
    }

    const { url, content } = req.body;
    console.log(url, content);
    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const pagePath = path.join(__dirname, "pages", `${sanitizedUrl}.txt`);

    fs.writeFile(pagePath, content, (err) => {
      if (err) {
        return res.status(500).send("Erro na criação da página");
      }
      res.redirect("/admin");
    });
  }
);

app.get("/pages/:page", (req, res) => {
  const { page } = req.params;
  const pagePath = path.join(
    __dirname,
    "pages",
    `${page.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`
  );

  fs.readFile(pagePath, "utf-8", (err, data) => {
    if (err) {
      return res.status(404).send("Página não encontrada");
    }
    const pageName = page.replace(/_/g, "-").replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
    res.render("page", { content: data, page: pageName });
  });
});

app.get("/pages/:page/edit", authVerify, (req, res) => {
  const { page } = req.params;
  const pagePath = path.join(
    __dirname,
    "pages",
    `${page.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`
  );

  fs.readFile(pagePath, "utf-8", (err, data) => {
    if (err) {
      return res.status(404).send("Página não encontrada");
    }
    const url = page.replace(/_/g, "-");
    res.render("edit", { content: data, url: url });
  });
});

app.post(
  "/pages/:page/edit",
  authVerify,
  [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("É necessário preencher o campo de Conteúdo"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("edit", {
        errors: errors.array(),
        content: req.body.content,
        url: req.params.page.replace(/_/g, "-"),
      });
    }

    const { content } = req.body;
    const oldPagePath = path.join(
      __dirname,
      "pages",
      `${req.params.page.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`
    );

    fs.writeFile(oldPagePath, content, (err) => {
      if (err) {
        return res.status(500).send("Erro ao editar a página");
      }
      res.redirect("/admin");
    });
  }
);

app.post("/pages/:page/delete", authVerify, (req, res) => {
  const { page } = req.params;
  const pagePath = path.join(
    __dirname,
    "pages",
    `${page.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`
  );

  fs.unlink(pagePath, (err) => {
    if (err) {
      return res.status(500).send("Erro ao excluir a página");
    }
    res.redirect("/admin");
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
