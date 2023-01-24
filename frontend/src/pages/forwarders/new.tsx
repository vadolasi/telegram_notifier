import { JSX } from "preact"
import useSWR from "swr"
import { useState } from "preact/hooks"
import Select from "react-select"
import ReactMarkdown from "react-markdown"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

const fetcher = (url: string) => fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const [name, setName] = useState("")
  const [fromChat, setFromChat] = useState<number | null>(null)
  const [toChat, setToChat] = useState<number | null>(null)
  const [messagesSelected, setMessagesSelected] = useState([])
  const [includesText, setIncludesText] = useState(false)
  const [textToMatch, setTextToMatch] = useState("")

  const { data: chats, error: chatsError } = useSWR("/chats", fetcher)
  const { data: messages, error: messagesError } = useSWR(fromChat ? `/chats/${fromChat}` : undefined, fetcher)

  const navigate = useNavigate()

  const onSubmit = async (ev: any) => {
    ev.preventDefault()

    const data = {
      name,
      fromChat,
      toChat,
      rule: {
        messages: messagesSelected.map((message: any) => {
          const m = messages?.find((m: any) => m.id === message)

          if (m.text) {
            return {
              type: "text",
              contains: includesText ? textToMatch : undefined,
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
        })
      }
    }

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/forwarders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": JSON.parse(localStorage.getItem("token")!)
        },
        body: JSON.stringify(data)
      })
      toast.success("Repassador criado!")
      navigate("/")
    } catch (error) {
      toast.error((error as any).message)
    }
  }

  return (
    <div>
      <h1>Novo Repassador</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label htmlFor="name">Nome</label>
          <input type="text" id="name" onChange={(e) => setName((e.target as any).value)} />
        </div>
        <div>
          <label htmlFor="fromChat">Chat de recebimento</label>
          <Select placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setFromChat(e.value)} />
        </div>
        <fieldset>
          <label htmlFor="include">
            <input type="radio" id="include" onChange={() => {setIncludesText(true)}} checked={includesText} value="1" />
            Contém texto
          </label>
          <label htmlFor="exact">
            <input type="radio" id="exact" onChange={() =>{setIncludesText(false)}} checked={!includesText} value="2" />
            Igual à mensagem
          </label>
        </fieldset>
        {fromChat && includesText && (
          <div>
            <label htmlFor="textToMatch">Text to match</label>
            <input type="text" id="textToMatch" onChange={(e) => setTextToMatch((e.target as any).value)} />
          </div>
        )}
        {fromChat && !includesText && (
          <div>
            <label htmlFor="messages">Mensagens</label>
            <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown className="truncate overflow-hidden">{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.sticker || message.media} /><span>{message.type}</span></div> }))} onChange={(e: any) => setMessagesSelected(e.map((m: any) => m.value))} />
          </div>
        )}
        <div>
          <label htmlFor="toChat">Chat de envio</label>
          <Select placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setToChat(e.value)} />
        </div>
        <div>
          <button type="submit">Criar</button>
          <a href="/">Cancelar</a>
        </div>
      </form>
    </div>
  )
}
