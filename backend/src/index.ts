import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { PrismaClient } from "@prisma/client"
import Redis from "ioredis"
import { config } from "dotenv"
import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"
import TelegramBot from "node-telegram-bot-api"
import { NewMessage } from "telegram/events"
import express from "express"
import cors from "cors"
import http from "http"

config()

const redis = new Redis(process.env.REDIS_URL!)

const prisma = new PrismaClient()

const connections: { [key: string]: TelegramClient } = {}

const app = express()
app.use(express.json())
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, { transports: ["polling"], cors: { origin: "*" } })

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

  // parse bigint to number
  return res.send(JSON.stringify(notifiers, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.post("/notifiers", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const user = req.user

  const { rule, message, chatId, name } = req.body

  const notifier = await prisma.notifier.create({
    data: {
      chatId,
      name,
      // @ts-ignore
      userId: user.id,
      // parse bigint to number
      rule: JSON.stringify(rule, (_key, value) => typeof value === "bigint" ? Number(value) : value),
      message
    }
  })

  connections[user.phoneNumber].addEventHandler(async ev => {
    let message: Message

    if (ev.message.text) {
      message = { type: "text", text: ev.message.text }
    } else if (ev.message.sticker) {
      message = { type: "sticker", sticker: Number(ev.message.sticker?.id) }
    } else if (ev.message.media) {
      message = { type: "media", media: ev.message.media.getBytes().toString("base64") }
    } else {
      return
    }

    if (rule.countMessages.find(m => JSON.stringify(m) === JSON.stringify(message))) {
      const count = await redis.incr(`notifier:${notifier.id}`)

      if (count >= rule.count) {
        await bot.sendMessage(Number(user.id), notifier.message)

        await redis.del(`notifier:${notifier.id}`)
      }
    } else if (rule.resetMessages.find(m => JSON.stringify(m) === JSON.stringify(message))) {
      await redis.del(`notifier:${notifier.id}`)
    }
  }, new NewMessage({ chats: [Number(notifier.chatId)] }))

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.delete("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.deleteMany({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
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

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.findFirst({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.delete("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.deleteMany({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.patch("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.updateMany({
    where: {
      id: req.params.id,
      // @ts-ignore
      userId: req.user.id
    },
    data: {
      chatId: parseInt(req.body.chatId),
      rule: JSON.stringify(req.body.rule, (_key, value) => typeof value === "bigint" ? Number(value) : value),
      message: req.body.message
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/chats", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const client = connections[req.user.phoneNumber]
  let chats: any

  try {
    chats = await Promise.all((await client.getDialogs({ limit: 100 })).map(async chat => ({
      id: Number(chat.id),
      name: chat.name || chat.title || "Unknown",
      image: (await client.downloadProfilePhoto(chat.inputEntity))?.toString("base64")
    })))
  } catch (e) {
    console.log(e)
    return
  }

  return res.send(JSON.stringify(chats, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/chats/:id", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const client = connections[req.user.phoneNumber]

  const chat = (await client.getMessages(parseInt(req.params.id), { limit: 30, offsetId: req.query.offsetId ? parseInt(req.query.offsetId as string) : undefined })).map(message => ({
    id: Number(message.id),
    type: message.text ? "text" : message.sticker ? "sticker" : message.media ? "media" : "unknown",
    text: message.text ? message.text : undefined,
    sticker: message.sticker ? Number(message.sticker?.id) : undefined,
    media: message.media ? message.media.getBytes().toString("base64") : undefined
  }))

  return res.send(JSON.stringify(chat, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

process.on("exit", async () => {
  await prisma.$disconnect()
  await bot.logOut()
  await bot.close()
})

process.on("SIGTERM", () => process.exit())
process.on("SIGINT", () => process.exit())

interface TextMessage {
  type: "text"
  text: string
}

interface StickerMessage {
  type: "sticker"
  sticker: number
}

interface MediaMessage {
  type: "media"
  media: string
}

type Message = TextMessage | StickerMessage | MediaMessage

;(async () => {
  await prisma.$connect()

  const users = await prisma.user.findMany({ include: { notifiers: true } })

  try {
    await Promise.all(users.map(async user => {
      connections[user.phoneNumber] = new TelegramClient(
        new StringSession(user.session),
        parseInt(process.env.TELEGRAM_API_ID!),
        process.env.TELEGRAM_API_HASH!,
        { connectionRetries: 5 }
      )

      await connections[user.phoneNumber].start({
        // @ts-ignore
        phoneNumber: () => user.phoneNumber,
        // @ts-ignore
        password: () => user.password,
        // @ts-ignore
        phoneCode: () => user.phoneCode,
        onError: e => console.log(e)
      })

      user.notifiers.forEach(notifier => {
        const rule: { countMessages: Message[], resetMessages?: Message[], count: number, continuos?: boolean } = JSON.parse(notifier.rule)

        connections[user.phoneNumber].addEventHandler(async ev => {
          let message: Message

          if (ev.message.text) {
            message = { type: "text", text: ev.message.text }
          } else if (ev.message.sticker) {
            message = { type: "sticker", sticker: Number(ev.message.sticker?.id) }
          } else if (ev.message.media) {
            message = { type: "media", media: ev.message.media.getBytes().toString("base64") }
          } else {
            return
          }

          if (rule.countMessages.find(m => JSON.stringify(m) === JSON.stringify(message))) {
            const count = await redis.incr(`notifier:${notifier.id}`)

            if (count >= rule.count) {
              await bot.sendMessage(Number(user.id), notifier.message)

              await redis.del(`notifier:${notifier.id}`)
            }
          } else if (rule.continuos) {
            await redis.del(`notifier:${notifier.id}`)
          } else if (rule.resetMessages?.find(m => JSON.stringify(m) === JSON.stringify(message))) {
            await redis.del(`notifier:${notifier.id}`)
          }
        }, new NewMessage({ chats: [Number(notifier.chatId)] }))
      })
    }))
  } catch (e) {
    console.log(e)
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 8000

  server.listen(port, () => {
    console.log("http://localhost:" + port)
  })
})()
