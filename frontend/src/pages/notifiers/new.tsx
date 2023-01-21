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
  const [blacklistMessage, setBlacklistMessage] = useState(false)
  const [textToMatch, setTextToMatch] = useState("")
  const [customMessage, setCustomMessage] = useState(true)
  const [useBot, setUseBot] = useState(true)
  const [chatToReply, setChatToReply] = useState(null)

  const onSubmit = async (ev: any) => {
    ev.preventDefault()

    const data = { forwardTo: useBot ? undefined : chatToReply, name, chatId: chat, message: customMessage ? message : "__forward__", rule: {
      count: quantity,
      continuos: continuos ? true : undefined,
      includesText: includesText ? textToMatch : undefined,
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
              <h2>Gatilhos</h2>
              <fieldset>
                <label htmlFor="include">
                  <input type="radio" id="include" onChange={() => {setIncludesText(true);setMatchMessage(false)}} checked={includesText} value="1" />
                  Contém texto
                </label>
                <label htmlFor="exact">
                  <input type="radio" id="exact" onChange={() =>{setIncludesText(false);setMatchMessage(true)}} checked={matchMessage} value="2" />
                  Igual à mensagem
                </label>
              </fieldset>
              {matchMessage && (
                <div>
                  <label htmlFor="message">Message</label>
                  <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown className="truncate overflow-hidden">{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.sticker || message.media} /><span>{message.type}</span></div> }))} onChange={(e: any) => setMessagesSelected(e.map((m: any) => m.value))} />
                </div>
              )}
              {includesText && (
                <div>
                  <label htmlFor="textToMatch">Text to match</label>
                  <input type="text" id="textToMatch" onChange={(e) => setTextToMatch((e.target as any).value)} />
                </div>
              )}
              <h2>Reset</h2>
              <fieldset>
                <label htmlFor="continuos">
                  <input type="radio" id="continuos" onChange={() => {setContinuos(true);setBlacklistMessage(false)}} checked={continuos} value="1" />
                  Apenas mensagens em seguida
                </label>
                <label htmlFor="igual">
                  <input type="radio" id="igual" onChange={() => {setContinuos(false);setBlacklistMessage(true)}} checked={blacklistMessage} value="2" />
                  Blacklist de mensagens
                </label>
              </fieldset>
              {blacklistMessage && (
                <div>
                  <label htmlFor="balcklistMessage">Balcklist Message</label>
                  <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown>{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.media} /><span>{message.type}</span></div> }))} onChange={(e: any) => setBalcklistMessagesSelected(e.map((m: any) => m.value))} />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="quantity">Quantidade</label>
          <input type="number" id="quantity" min={1} onChange={(e) => setQuantity(parseInt((e.target as any).value))} />
        </div>
        <fieldset>
          <label htmlFor="exact">
            <input type="radio" id="exact" onChange={() => setCustomMessage(true)} checked={customMessage} value="2" />
            Texto personalizado
          </label>
          <label htmlFor="include">
            <input type="radio" id="include" onChange={() => setCustomMessage(false)} checked={!customMessage} value="1" />
            Repassar mensagem
          </label>
        </fieldset>
        {customMessage && (
          <div className="flex items-center gap-4">
            <label htmlFor="message">Message</label>
            <input type="text" id="message" onChange={(e) => setMessage((e.target as any).value)} />
          </div>
        )}
        <fieldset>
          <label htmlFor="exact">
            <input type="radio" id="exact" onChange={() => setUseBot(true)} checked={useBot} value="2" />
            Enviar pelo bot
          </label>
          <label htmlFor="include">
            <input type="radio" id="include" onChange={() => setUseBot(false)} checked={!useBot} value="1" />
            Enviar para o chat
          </label>
        </fieldset>
        {!useBot && (
          <div className="flex items-center gap-4">
            <label htmlFor="message">Chat</label>
            <Select placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setChatToReply(e.value)} />
          </div>
        )}
        <div>
          <button type="submit">Criar</button>
          <a href="/">Cancelar</a>
        </div>
      </form>
    </div>
  )
}
