const express = require("express")
const app = express()

const bcrypt = require("bcrypt")

const path = require("path")

const redis = require("redis")
const client = redis.createClient()

const session = require("express-session")

const RedisStore = require("connect-redis")(session)

app.set("view engine", "pug")
app.set("views", path.join(__dirname, "views"))
app.use(
  session({
    store: new RedisStore({ client: client }),
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 36000000,
      httpOnly: false,
      secure: false,
    },
    secret: "brgksf980SARulfNSeUFURWLTY8vyf",
  })
)
app.use(express.urlencoded({ extended: true }))

app.listen(3000, () => console.log("Server ready"))

app.get("/", (req, res) => {
  if (req.session.userid) {
    res.render("dashboard")
  } else {
    res.render("login")
  }
})

app.post("/", (req, res) => {
  const saveSessionAndRenderDashboard = (userid) => {
    req.session.userid = userid
    req.session.save()
    res.render("dashboard")
  }

  const { username, password } = req.body
  if (!username || !password) {
    res.render("error", {
      message: "Please set both username and password",
    })
    return
  }

  console.log(req.body, username, password)

  const handleSignup = (username, password) => {
    client.incr("userid", async (err, userid) => {
      client.hset("users", username, userid)

      const saltRounds = 10
      const hash = await bcrypt.hash(password, saltRounds)

      client.hset(`user:${userid}`, "hash", hash, "username", username)

      saveSessionAndRenderDashboard(userid)
    })
  }

  const handleLogin = (userid, password) => {
    client.hget(`user:${userid}`, "hash", async (err, hash) => {
      const result = await bcrypt.compare(password, hash)
      if (result) {
        saveSessionAndRenderDashboard(userid)
      } else {
        res.render("error", {
          message: "Incorrect password",
        })
        return
      }
    })
  }

  client.hget("users", username, (err, userid) => {
    if (!userid) {
      handleSignup(username, password)
    } else {
      handleLogin(userid, password)
    }
  })
})
