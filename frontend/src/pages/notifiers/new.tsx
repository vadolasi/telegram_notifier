import { JSX } from "preact"
import useSWR from "swr"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "preact/hooks"
import Select from "react-select"
import ReactMarkdown from "react-markdown"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

const schema = z.object({
  name: z.string().min(1).max(255),
  chat: z.number(),
  messages: z.array(z.number()),
  balcklistMessages: z.array(z.number()),
  quantity: z.number(),
  message: z.string()
})

const fetcher = (url: string) => fetch(url, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const [chat, setChat] = useState<number | null>(null)
  const { data: chats, error: chatsError } = useSWR("http://localhost:8000/chats", fetcher)
  const { data: messages, error: messagesError } = useSWR(chat ? `http://localhost:8000/chats/${chat}` : undefined, fetcher)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    mode: "onBlur"
  })

  const onSubmit = async (data: any) => {
    data.rule = {
      count: data.quantity,
      countMessages: data.messages.map((message: any) => {
        const m = messages?.find((m: any) => m.id === message)

        if (m.text) {
          return {
            type: "text",
            text: m.text
          }
        } else if (m.media) {
          return {
            type: "media",
            media: m.media
          }
        } else {
          return {
            type: "sticker",
            sticker: m.sticker
          }
        }
      }),
      resetMessages: data.balcklistMessages.map((message: any) => {
        const m = messages?.find((m: any) => m.id === message)

        if (m.text) {
          return {
            type: "text",
            text: m.text
          }
        } else if (m.media) {
          return {
            type: "media",
            media: m.media
          }
        } else {
          return {
            type: "sticker",
            sticker: m.sticker
          }
        }
      })
    }
    data.chat = undefined
    data.messages = undefined
    data.balcklistMessages = undefined
    data.quantity = undefined

    try {
      await fetch("http://localhost:8000/notifiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Auhtorization": JSON.parse(localStorage.getItem("token")!)
        },
        body: JSON.stringify(data)
      })
      toast.success("Notifier created!")
      navigate("/")
    } catch (error) {
      toast.error((error as any).message)
    }
  }

  return (
    <div>
      <h1>New Notifier</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="name">Name</label>
          <input type="text" id="name" {...register("name")} />
          {errors.name && <p>{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="chat">Chat</label>
          <Select {...register("chat")} placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setChat(e.value)} />

          {chat && (
            <>
              <div>
                <label htmlFor="message">Message</label>
                <Select {...register("message")} placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown className="truncate overflow-hidden">{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={`data:image/jpeg;charset=utf-8;base64,${message.media}`} /><span>{message.type}</span></div> }))} />
              </div>
              <div>
                <label htmlFor="balcklistMessage">Balcklist Message</label>
                <Select {...register("balcklistMessage")} placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown>{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={`data:image/jpeg;charset=utf-8;base64,${message.media}`} /><span>{message.type}</span></div> }))} />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="quantity">Quantity</label>
          <input type="number" id="quantity" {...register("quantity")} min={1} />
          {errors.quantity && <p>{errors.quantity.message}</p>}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="message">Message</label>
          <input type="text" id="message" {...register("message")} />
          {errors.message && <p>{errors.message.message}</p>}
        </div>
        <div>
          <button type="submit">Create</button>
          <a href="/">Cancel</a>
        </div>
      </form>
    </div>
  )
}
