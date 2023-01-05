import { JSX } from "preact"
import useSWR from "swr"
import { useState } from "preact/hooks"
import Select from "react-select"
import ReactMarkdown from "react-markdown"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

const fetcher = (url: string) => fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const [chat, setChat] = useState<number | null>(null)
  const { data: chats, error: chatsError } = useSWR("/chats", fetcher)
  const { data: messages, error: messagesError } = useSWR(chat ? `/chats/${chat}` : undefined, fetcher)
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [messagesSelected, setMessagesSelected] = useState([])
  const [balcklistMessagesSelected, setBalcklistMessagesSelected] = useState([])
  const [continuos, setContinuos] = useState(false)
  const [includesText, setIncludesText] = useState(false)
  const [matchMessage, setMatchMessage] = useState(false)

  const onSubmit = async (ev: any) => {
    ev.preventDefault()

    const data = { name, chatId: chat, message, rule: {
      count: quantity,
      continuos: continuos ? true : undefined,
      includesText: includesText ? includesText : undefined,
      countMessages: messagesSelected.map((message: any) => {
        const m = messages?.find((m: any) => m.id === message)

        if (m.text) {
          return {
            type: "text",
            text: m.text
          }
        } else if (m.sticker) {
          return {
            type: "sticker",
            sticker: m.sticker
          }
        } else {
          return {
            type: "media",
            media: m.media
          }
        }
      }),
      resetMessages: balcklistMessagesSelected.map((message: any) => {
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
    }}

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/notifiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": JSON.parse(localStorage.getItem("token")!)
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
      <form onSubmit={onSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input type="text" id="name" onChange={(e) => setName((e.target as any).value)} />
        </div>
        <div>
          <label htmlFor="chat">Chats</label>
          <Select placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setChat(e.value)} />
          {chat && (
            <>
              <div>
                <label htmlFor="message">Message</label>
                <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown className="truncate overflow-hidden">{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.sticker || message.media} /><span>{message.type}</span></div> }))} onChange={(e: any) => setMessagesSelected(e.map((m: any) => m.value))} />
              </div>
              <fieldset>
                <div>
                  <input type="radio" id="continuos" onChange={() => setContinuos(!continuos)} selected={continuos} />
                  <label htmlFor="continuos">Apenas mensagens em seguida</label>
                </div>
                <div>
                  <input type="radio" id="matchText" onChange={() => setIncludesText(!includesText)} selected={includesText} />
                  <label htmlFor="matchText">Contém texto</label>
                </div>
                <div>
                  <input type="radio" id="igual" onChange={() => setMatchMessage(!matchMessage)} selected={matchMessage} />
                  <label htmlFor="igual">Não contém texto</label>
                </div>
              </fieldset>
              {matchMessage && (
                <div>
                  <label htmlFor="balcklistMessage">Balcklist Message</label>
                  <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown>{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.media} /><span>{message.type}</span></div> }))} onChange={(e: any) => setBalcklistMessagesSelected(e.map((m: any) => m.value))} />
                </div>
              )}
              {includesText && (
                <div>
                  <label htmlFor="text">Text</label>
                  <input type="text" id="text" onChange={(e) => setIncludesText((e.target as any).value)} />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="quantity">Quantity</label>
          <input type="number" id="quantity" min={1} onChange={(e) => setQuantity(parseInt((e.target as any).value))} />
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="message">Message</label>
          <input type="text" id="message" onChange={(e) => setMessage((e.target as any).value)} />
        </div>
        <div>
          <button type="submit">Create</button>
          <a href="/">Cancel</a>
        </div>
      </form>
    </div>
  )
}
