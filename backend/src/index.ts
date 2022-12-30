import { Server } from "hyper-express"
import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { PrismaClient } from "@prisma/client"
import Redis from "ioredis"
import { config } from "dotenv"
import { Server as IO } from "socket.io"
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"
import TelegramBot from "node-telegram-bot-api"

config()

const redis = new Redis(process.env.REDIS_URL!)

const prisma = new PrismaClient()

const connections: { [key: string]: TelegramClient } = {}

const app = new Server()
const io = new IO({ cors: { origin: "*" } })

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")

  next()
})

io.attachApp(app.uws_instance)

const JWT_SECRET = process.env.JWT_SECRET!

const jwtMiddleware = (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    res.status(401).send("Unauthorized")

    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    req.user = decoded

    next()
  } catch (error) {
    res.status(401).send("Unauthorized")
  }
}

io.on("connection", (socket) => {
  socket.on("verify", async (phoneNumber: string) => {
    phoneNumber = phoneNumber.replace(" ", "+")

    if (connections[phoneNumber]) {
      socket.emit("alreadyConnected")

      const user = (await prisma.user.findUnique({
        where: {
          phoneNumber
        }
      }))!

      const code = randomUUID()

      await redis.set(code, user.phoneNumber)

      await bot.sendMessage(
        Number(user.id),
        "Foi detectado que você está tentando fazer login, se você não fez isso, ignore esta mensagem. Para prosseguir, clique no botão abaixo.",
        { reply_markup: { inline_keyboard: [
          [
            {
              text: "Prosseguir",
              url: `${process.env.FRONTEND_URL!}/verify?code=${code}`
            }
          ]
        ]}}
      )

      return
    }

    connections[phoneNumber] = new TelegramClient(
      new StringSession(""),
      parseInt(process.env.TELEGRAM_API_ID!),
      process.env.TELEGRAM_API_HASH!,
      {
        connectionRetries: 5
      }
    )

    let hasError = false

    await connections[phoneNumber].start({
      phoneNumber,
      phoneCode: () => new Promise(resolve => {
        socket.on("code", resolve)
      }),
      password: () => new Promise(resolve => {
        socket.emit("password")
        socket.on("password", resolve)
      }),
      onError: (error) => {
        hasError = true
        socket.emit("error", error)
      }
    })

    if (hasError) return

    const id = Number(await connections[phoneNumber].getPeerId("me"))

    await prisma.user.create({
      data: {
        id,
        phoneNumber,
        // @ts-ignore
        session: connections[phoneNumber].session.save()
      }
    })

    socket.emit("success", jwt.sign({ phoneNumber, id }, process.env.JWT_SECRET!))

    await bot.sendMessage(
      id,
      "Cadastro concluido com sucesso! Clique no botão abaixo paara acessar o painel",
      { reply_markup: { inline_keyboard: [
        [
          {
            text: "Acessar painel",
            url: `${process.env.FRONTEND_URL!}/`
          }
        ]
      ]}}
    )
  })
})

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true })

bot.onText(/\/start/, async (msg) => {
  if (await prisma.user.findUnique({ where: { id: Number(msg.chat.id) } })) {
    await bot.sendMessage(
      msg.chat.id,
      "Você já está cadastrado! Para acessar o painel, clique no botão abaixo.",
      { reply_markup: { inline_keyboard: [
        [
          {
            text: "Acessar painel",
            url: `${process.env.FRONTEND_URL!}/`
          }
        ]
      ]}}
    )

    return
  }

  await bot.sendMessage(
    msg.chat.id,
    "Olá! Para começar a usar o bot, por favor me clique no botão abaixo e envie seu contato.",
    { reply_markup: { keyboard: [
      [
        {
          text: "Enviar contato",
          request_contact: true
        }
      ]
    ]}}
  )
})

bot.on("message", async (msg) => {
  if (msg.contact) {
   if (await prisma.user.findUnique({ where: { id: Number(msg.chat.id) } })) {
      await bot.sendMessage(
        msg.chat.id,
        "Você já está cadastrado! Para acessar o painel, clique no botão abaixo.",
        { reply_markup: { inline_keyboard: [
          [
            {
              text: "Acessar painel",
              url: `${process.env.FRONTEND_URL!}/`
            }
          ]
        ]}}
      )
    } else {
      await bot.sendMessage(
        msg.chat.id,
        "Para prosseguir, clique no botão abaixo:",
        { reply_markup: { inline_keyboard: [
          [
            {
              text: "Prosseguir",
              url: `${process.env.FRONTEND_URL!}/verify?phone=${msg.contact!.phone_number}`
            }
          ]
        ]}}
      )
    }
  }
})

app.get("/notifiers", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.user.id

  const notifiers = await prisma.notifier.findMany({ where: { userId } })

  res.json(notifiers)
})

app.post("/notifiers", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.create({
    data: {
      chatId: parseInt(req.body.chatId),
      // @ts-ignore
      userId: req.user.id,
      rule: req.body.rule
    }
  })

  res.json(notifier)
})

app.delete("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.deleteMany({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    }
  })

  res.json(notifier)
})

app.patch("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.updateMany({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    },
    data: {
      chatId: parseInt(req.body.chatId)
    }
  })

  res.json(notifier)
})

app.get("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.findFirst({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    }
  })

  res.json(notifier)
})


app.get("/chats", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const client = connections[req.user.phoneNumber]

  const chats = await Promise.all((await client.getDialogs({ limit: Infinity })).map(async chat => ({
    id: Number(chat.id),
    name: chat.name || chat.title || "Unknown",
    image: (await client.downloadProfilePhoto(chat.inputEntity))?.toString("base64")
  })))

  res.json(chats)
})

app.get("/chats/:id", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const client = connections[req.user.phoneNumber]

  const chat = (await client.getMessages(parseInt(req.params.id), { limit: 30, offsetId: req.query.offsetId ? parseInt(req.query.offsetId as string) : undefined })).map(message => ({
    id: Number(message.id),
    type: message.text ? "text" : message.sticker ? "sticker" : message.media ? "media" : "unknown",
    text: message.text ? message.text : undefined,
    sticker: message.sticker?.getBytes().toString("base64"),
    media: message.media?.getBytes().toString("base64")
  }))

  res.json(chat)
})

process.on("exit", async () => {
  await prisma.$disconnect()
  await bot.logOut()
  await bot.close()
})

process.on("SIGTERM", () => process.exit())

;(async () => {
  await prisma.$connect()
  await app.listen(8000)

  console.log("Listening on http://localhost:8000")
})()
