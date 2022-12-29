import { Server } from "hyper-express"
import { TelegramClient } from "telegram"
import { Button } from "telegram/tl/custom/button"
import { StringSession } from "telegram/sessions"
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import Redis from "ioredis"
import { config } from "dotenv"
import { NewMessage } from "telegram/events"
import { Server as IO } from "socket.io"
import parser from "socket.io-msgpack-parser"
import jwt from "jsonwebtoken"

config()

const redis = new Redis(process.env.REDIS_URL!)

const prisma = new PrismaClient()

const connections: { [key: string]: TelegramClient } = {}

const app = new Server()
const io = new IO({ cors: { origin: "*" }, transports: ["websocket", "polling"] })

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")

  next()
})

io.attachApp(app.uws_instance)

io.on("connection", (socket) => {
  socket.on("verify", async (phoneNumber: string) => {
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

    socket.emit("success", jwt.sign({ phoneNumber }, process.env.JWT_SECRET!))
  })
})

const bot = new TelegramClient(
  new StringSession(readFileSync("session.txt", "utf-8")),
  parseInt(process.env.TELEGRAM_API_ID!),
  process.env.TELEGRAM_API_HASH!,
  {
    connectionRetries: 5
  }
)

bot.addEventHandler(async event => {
  if (event.message.message.startsWith("/start")) {
    // send a button to get user contact
    await bot.sendMessage(event.chatId!, {
      message: "Olá! Para começar a usar o bot, por favor me clique no botão abaixo e envie seu contato.",
      buttons: [
        Button.requestPhone("Enviar contato")
      ]
    })
  } else if (event.message.contact) {
    await bot.sendMessage(event.chatId!, {
      message: `Para prosseguir, entre neste link: ${process.env.FRONTEND_URL!}/verify?phone=${event.message.contact.phoneNumber}`
    })
  }
}, new NewMessage({}))

app.get("/notifiers", async (_req, res) => {
  const notifiers = await prisma.notifier.findMany()

  res.json(notifiers)
})

app.post("/notifiers", async (req, res) => {
  const notifier = await prisma.notifier.create({
    data: {
      chatId: parseInt(req.body.chatId),
      rule: req.body.rule
    }
  })

  res.json(notifier)
})

app.delete("/notifiers/:id", async (req, res) => {
  const notifier = await prisma.notifier.delete({
    where: {
      id: req.params.id
    }
  })

  res.json(notifier)
})

app.patch("/notifiers/:id", async (req, res) => {
  const notifier = await prisma.notifier.update({
    where: {
      id: req.params.id
    },
    data: {
      chatId: parseInt(req.body.chatId)
    }
  })

  res.json(notifier)
})

app.get("/notifiers/:id", async (req, res) => {
  const notifier = await prisma.notifier.findUnique({
    where: {
      id: req.params.id
    }
  })

  res.json(notifier)
})


/*
app.get("/chats", async (_req, res) => {
  const chats = await Promise.all((await client.getDialogs({ limit: Infinity })).map(async chat => ({
    id: Number(chat.id),
    name: chat.name || chat.title || "Unknown",
    image: (await client.downloadProfilePhoto(chat.inputEntity))?.toString("base64")
  })))

  res.json(chats)
})
*/

/*
app.get("/chats/:id", async (req, res) => {
  const chat = (await client.getMessages(parseInt(req.params.id), { limit: 30, offsetId: req.query.offsetId ? parseInt(req.query.offsetId as string) : undefined })).map(message => ({
    id: Number(message.id),
    type: message.text ? "text" : message.sticker ? "sticker" : message.media ? "media" : "unknown",
    text: message.text ? message.text : undefined,
    sticker: message.sticker?.getBytes().toString("base64"),
    media: message.media?.getBytes().toString("base64")
  }))

  res.json(chat)
})
*/

;(async () => {
  await bot.start({
    botAuthToken: process.env.TELEGRAM_BOT_TOKEN!
  })
  bot.setParseMode("html")

  await app.listen(8000)

  console.log("Listening on http://localhost:8000")
})()
