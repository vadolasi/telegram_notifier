import { Server } from "hyper-express"
import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { config } from "dotenv"
import { readFileSync } from "fs"
import input from "input"

config()

const client = new TelegramClient(new StringSession(readFileSync("client.txt", "utf8")), parseInt(process.env.API_ID!), process.env.API_HASH!, {
  connectionRetries: 5
})

const bot = new TelegramClient(new StringSession(readFileSync("bot.txt", "utf8")), parseInt(process.env.API_ID!), process.env.API_HASH!, {
  connectionRetries: 5
})

const app = new Server()

app.get("/", async (req, res) => {
  bot.sendMessage(await client.getInputEntity("me"), { message: "Teste" })
  res.json({ message: "Hello World" })
})

;(async () => {
  await bot.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () => await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err)
  })

  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () => await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err)
  })

  await app.listen(8000)
  console.log("Server started on http://localhost:8000")
})()
