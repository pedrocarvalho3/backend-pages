const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");
const { body, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");

const app = express();

dotenv.config();

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

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
      res.cookie("loggedIn", true, { maxAge: 60000 });
      console.log("Usuário logado");
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
