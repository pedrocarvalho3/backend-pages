const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");
const { body, validationResult } = require("express-validator");

const app = express();

dotenv.config();

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "chave-secreta",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Página inicial");
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
      return res.redirect("/admin");
    } else {
      res.render("login", { errors: [{ msg: "Usuário ou senha inválidos" }] });
    }
  }
);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
