import { Api, TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { PrismaClient } from "@prisma/client"
import Redis from "ioredis"
import { config } from "dotenv"
import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import TelegramBot from "node-telegram-bot-api"
import { NewMessage, NewMessageEvent } from "telegram/events"
import express from "express"
import cors from "cors"
import http from "http"
import cookieParser from "cookie-parser"
import bcrypt from "bcrypt"
import cookie from "cookie"

config()

const redis = new Redis(process.env.REDIS_URL!)

const prisma = new PrismaClient()

const connections: { [key: string]: TelegramClient } = {}

const app = express()
app.use(express.json())
app.use(cors())
app.use(cookieParser())

const server = http.createServer(app)

const io = new Server(server, { transports: ["polling"], cors: { origin: "*" } })

const JWT_SECRET = process.env.JWT_SECRET!

const jwtMiddleware = (req: any, res: any, next: any) => {
  const token = req.cookies.token

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
    if (connections[phoneNumber]) {
      return
    }

    const cookies = cookie.parse(socket.handshake.headers.cookie || "")
    const token = cookies.token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string }

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

    await prisma.phoneNumber.create({
      data: {
        id,
        phoneNumber,
        // @ts-ignore
        session: connections[phoneNumber].session.save(),
        userId: decoded.id
      }
    })

    socket.emit("success")
  })
})

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true })

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id

  await bot.sendMessage(chatId, "Olá! Para acessar o painel clique no botão abaixo", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Acessar painel",
            url: `${process.env.FRONTEND_URL}/login`
          }
        ]
      ]
    }
  })
})

app.post("/register", async (req, res) => {
  const { email, password } = req.body

  let user = await prisma.user.findUnique({
    where: {
      email
    }
  })

  if (user) {
    return res.status(400).json({
      message: "User already exists"
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword
    }
  })

  res.cookie("token", jwt.sign({ id: user.id }, process.env.JWT_SECRET!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  })

  res.status(200).json({})
})

app.post("/login", async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({
    where: {
      email
    }
  })

  if (!user) {
    return res.status(400).json({
      message: "User not found"
    })
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password)

  if (!isPasswordCorrect) {
    return res.status(400).json({
      message: "Incorrect password"
    })
  }

  res.cookie("token", jwt.sign({ id: user.id }, process.env.JWT_SECRET!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  })

  res.status(200).json({})
})

app.post("/massive_add", jwtMiddleware, async (req, res) => {
  const { phoneNumbers, smallDelay, bigDelay, cicleSize } = req.body

  const clients = Object.entries(connections).filter(([phoneNumber]) => phoneNumbers.includes(phoneNumber)).map(([_, client]) => client)
  const client = clients[0]

  const entity = await client.getEntity(req.body.toChat)
  const inputEntity = await client.getInputEntity(entity)

  res.status(200).json({})

  let i = 0
  let cicles = 0
  const phonesQuantity = phoneNumbers.length

  for await (const participant of client.iterParticipants(await client.getEntity(req.body.fromChat))) {
    const clientToUse = clients[i]

    try {
      await clientToUse.invoke(
        new Api.messages.AddChatUser({
          chatId: entity.id,
          userId: await client.getInputEntity(participant)
        })
      )
    } catch (error) {
      console.log(error)
    }

    try {
      await clientToUse.invoke(
        new Api.channels.InviteToChannel({
          channel: inputEntity,
          users: [participant]
        })
      )
    } catch (error) {
      console.log(error)
    }

    i++

    if (i === phonesQuantity) {
      cicles++
      i = 0

      if (cicles === cicleSize) {
        cicles = 0
        await new Promise((resolve) => setTimeout(resolve, bigDelay))
      } else {
        await new Promise((resolve) => setTimeout(resolve, smallDelay))
      }
    }
  }
})

app.get("/notifiers", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.user.id

  const notifiers = await prisma.notifier.findMany({ where: { phone: { userId } } })

  // parse bigint to number
  return res.send(JSON.stringify(notifiers, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.post("/notifiers", jwtMiddleware, async (req, res) => {
  const { rule, message, chatId, name, phoneNumberId } = req.body

  const notifier = await prisma.notifier.create({
    data: {
      chatId,
      name,
      phoneId: phoneNumberId,
      // parse bigint to number
      rule: JSON.stringify(rule, (_key, value) => typeof value === "bigint" ? Number(value) : value),
      message
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.delete("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.deleteMany({
    where: {
      id: req.params.id,
      phone: {
        // @ts-ignore
        userId: req.user.id
      }
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.findFirst({
    where: {
      id: req.params.id,
      phone: {
        // @ts-ignore
        userId: req.user.id
      }
    }
  })

  return res.send(JSON.stringify(notifier, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.delete("/notifiers/:id", jwtMiddleware, async (req, res) => {
  const notifier = await prisma.notifier.deleteMany({
    where: {
      id: req.params.id,
      phone: {
        // @ts-ignore
        userId: req.user.id
      }
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

app.get("/phones", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.user.id

  const phones = await prisma.phoneNumber.findMany({ where: { userId } })

  // parse bigint to number
  return res.send(JSON.stringify(phones, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/chats/:id", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const client = connections[req.user.phoneNumber]

  const chat = await Promise.all((await client.getMessages(parseInt(req.params.id), { limit: 20, offsetId: req.query.offsetId ? parseInt(req.query.offsetId as string) : undefined })).map(async message => {
    let stickerUrl: string | undefined = undefined

    try {
      if (message.sticker) {
        const form = new FormData()
        const buffer = await client.downloadMedia(message.media!)
        if (message.sticker.mimeType === "application/x-tgsticker") {
          stickerUrl = `http://152.70.215.19/${String(message.sticker.id)}`
          form.append("file", new Blob([buffer!]), "AnimatedSticker.tgs")
          form.append("sticker_id", String(message.sticker.id))
          form.append("compress", "true")
          await fetch("http://152.70.215.19", {
            method: "POST",
            body: form
          })
        } else {
          stickerUrl = `data:image/webp;base64,${buffer!.toString("base64")}`
        }
      }
    } catch (e) {
      console.log(e)
    }

    return {
      id: Number(message.id),
      type: message.text ? "text" : message.sticker ? "sticker" : message.media ? "media" : "unknown",
      text: message.text ? message.text : undefined,
      stickerUrl,
      sticker: message.sticker ? String(message.sticker.id) : undefined,
      media: message.media && !message.sticker ? "data:image/png;base64," + (await client.downloadMedia(message))!.toString("base64") : undefined,
    }
  }))

  return res.send(JSON.stringify(chat, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/forwarders", jwtMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.user.id

  const forwarders = await prisma.forwarder.findMany({ where: { phone: { userId } } })

  // parse bigint to number
  return res.send(JSON.stringify(forwarders, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.post("/forwarders", jwtMiddleware, async (req, res) => {
  const { fromChat, toChat, name, rule, phoneNumberId } = req.body

  const forwarder = await prisma.forwarder.create({
    data: {
      fromChat: Number(fromChat),
      toChat: Number(toChat),
      name,
      phoneId: phoneNumberId,
      rule: JSON.stringify(rule, (_key, value) => typeof value === "bigint" ? Number(value) : value)
    }
  })

  return res.send(JSON.stringify(forwarder, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.delete("/forwarders/:id", jwtMiddleware, async (req, res) => {
  const forwarder = await prisma.forwarder.deleteMany({
    where: {
      id: req.params.id,
      phone: {
        // @ts-ignore
        userId: req.user.id
      }
    }
  })

  return res.send(JSON.stringify(forwarder, (_key, value) => typeof value === "bigint" ? Number(value) : value))
})

app.get("/forwarders/:id", jwtMiddleware, async (req, res) => {
  const forwarder = await prisma.forwarder.findFirst({
    where: {
      id: req.params.id,
      phone: {
        // @ts-ignore
        userId: req.user.id
      }
    }
  })

  return res.send(JSON.stringify(forwarder, (_key, value) => typeof value === "bigint" ? Number(value) : value))
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
  sticker: string
}

interface MediaMessage {
  type: "media"
  media: string
}

type Message = TextMessage | StickerMessage | MediaMessage

;(async () => {
  await prisma.$connect()

  const users = await prisma.phoneNumber.findMany({ include: { notifiers: true, forwarders: true } })

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

      const handler = async (ev: NewMessageEvent) => {
        const notifiers = await prisma.notifier.findMany({
          where: {
            chatId: Number(ev.message.chatId),
            // @ts-ignore
            userId: user.id
          }
        })

        notifiers.forEach(async notifier => {
          const rule: { countMessages: Message[], includesText?: string[], resetMessages?: Message[], count: number, continuos?: boolean, includesTextB?: string[] } = JSON.parse(notifier.rule)

          let message: Message

          if (ev.message.text) {
            message = { type: "text", text: ev.message.text }
          } else if (ev.message.sticker) {
            message = { type: "sticker", sticker: String(ev.message.sticker?.id) }
          } else if (ev.message.media) {
            message = { type: "media", media: ev.message.media.getBytes().toString("base64") }
          } else {
            return
          }

          if ((rule.includesText && rule.includesText.find(t => ev.message.text?.includes(t))) || (rule.countMessages.find(m => JSON.stringify(m) === JSON.stringify(message)))) {
            const count = await redis.incr(`notifier:${notifier.id}`)

            if (count >= rule.count) {
              await bot.sendMessage(Number(user.id), notifier.message)

              await redis.del(`notifier:${notifier.id}`)
            }
          } else if (rule.continuos) {
            if (!(rule.resetMessages?.find(m => JSON.stringify(m) === JSON.stringify(message)) || (rule.includesTextB && rule.includesTextB.find(t => ev.message.text?.includes(t))))) {
              await redis.del(`notifier:${notifier.id}`)
            }
          }
        })

        const forwarders = await prisma.forwarder.findMany({
          where: {
            fromChat: Number(ev.message.chatId),
            // @ts-ignore
            userId: user.id
          }
        })

        forwarders.forEach(async forwarder => {
          const rule: { messages: { type: "text" | "sticker" | "media", contains?: boolean, text?: string, sticker: string }[] } = JSON.parse(forwarder.rule)

          rule.messages.forEach(async rule => {
            if (rule.type === "text" && (rule.contains ? ev.message.text?.includes(rule.text!) : ev.message.text === rule.text)) {
              const message = await connections[user.phoneNumber].sendMessage(Number(forwarder.toChat), {
                message: ev.message.text
              })
              // @ts-ignore
              await handler({ ...ev, message })
            } else if ((rule.type === "sticker") && String(ev.message.sticker?.id) === rule.sticker) {
              const message = await connections[user.phoneNumber].sendMessage(Number(forwarder.toChat), {
                file: ev.message.media!
              })
              // @ts-ignore
              await handler({ ...ev, message })
            } else if ((rule.type === "media") && ev.message.media) {
              const message = await connections[user.phoneNumber].sendMessage(Number(forwarder.toChat), {
                file: ev.message.media!
              })
              // @ts-ignore
              await handler({ ...ev, message })
            }
          })
        })
      }

      connections[user.phoneNumber].addEventHandler(handler, new NewMessage({}))
    }))
  } catch (e) {
    console.log(e)
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 8000

  server.listen(port, () => {
    console.log("http://localhost:" + port)
  })
})()
