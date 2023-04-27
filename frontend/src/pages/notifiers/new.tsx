import { JSX } from "preact"
import useSWR from "swr"
import { useEffect, useState } from "preact/hooks"
import Select from "react-select"
import ReactMarkdown from "react-markdown"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

const fetcher = (url: string) => fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const [chat, setChat] = useState<number | null>(null)
  const { data: chats, error: chatsError } = useSWR("/chats", fetcher)
  const { data: messages, error: messagesError } = useSWR(chat ? `/chats/${chat}` : undefined, fetcher)
  const { data: phoneNumbers, error: phoneNumbersError } = useSWR("/phones", fetcher)
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [messagesSelected, setMessagesSelected] = useState([])
  const [balcklistMessagesSelected, setBalcklistMessagesSelected] = useState([])
  const [continuos, setContinuos] = useState(false)
  const [includesText, setIncludesText] = useState(false)
  const [matchMessage, setMatchMessage] = useState(false)
  const [includesTextB, setIncludesTextB] = useState(false)
  const [matchMessageB, setMatchMessageB] = useState(false)
  const [textsToMatch, setTextsToMatch] = useState<string[]>([])
  const [textsToMatchB, setTextsToMatchB] = useState<string[]>([])
  const [number, setNumber] = useState("")

  useEffect(() => {
    console.log(messages)
  }, [messages])

  const onSubmit = async (ev: any) => {
    ev.preventDefault()

    const data = { name, chatId: chat, message, rule: {
      count: quantity,
      continuos,
      phoneNumberId: number,
      includesText: includesText ? textsToMatch : undefined,
      includesTextB: includesTextB ? textsToMatchB : undefined,
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
      <h1>Novo Notificador</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label htmlFor="name">Nome</label>
          <input type="text" id="name" onChange={(e) => setName((e.target as any).value)} />
        </div>
        <div>
          <label htmlFor="number">Número</label>
          <Select placeholder="Selecione o número..." options={phoneNumbers?.map((phone: any) => ({ value: phone.id, label: phone.number }))} onChange={(e: any) => setNumber(e.value)} />
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
                  <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown className="truncate overflow-hidden">{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.sticker ? message.stickerUrl : message.media} width="64" height="64" /><span>{message.type}</span></div> }))} onChange={(e: any) => setMessagesSelected(e.map((m: any) => m.value))} />
                </div>
              )}
              {includesText && (
                <div>
                  <label htmlFor="textToMatch">Text to match</label>
                  {textsToMatch.map((text, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <input type="text" value={text} onChange={(e) => {
                        setTextsToMatch(textsToMatch.map((t, i) => i === index ? (e.target as any).value : t))
                      }} />
                      <button type="button" onClick={() => {
                        setTextsToMatch(textsToMatch.filter((_, i) => i !== index))
                      }}>X</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    setTextsToMatch(textsToMatch => [...textsToMatch, ""])
                  }}>Adicionar</button>
                </div>
              )}
              <h2>Reset</h2>
              <label htmlFor="continuos">
                <input type="checkbox" id="continuos" onChange={() => {setContinuos(!continuos)}} checked={continuos} />
                Apenas mensagens em seguida
              </label>
              <h2>Blacklist</h2>
              <fieldset>
                <label htmlFor="includeb">
                  <input type="radio" id="includeb" onChange={() => {setIncludesTextB(true);setMatchMessageB(false)}} checked={includesTextB} value="1" />
                  Contém texto
                </label>
                <label htmlFor="exactb">
                  <input type="radio" id="exact" onChange={() =>{setIncludesTextB(false);setMatchMessageB(true)}} checked={matchMessageB} value="2" />
                  Igual à mensagem
                </label>
              </fieldset>
              {matchMessageB && (
                <div>
                  <label htmlFor="balcklistMessage">Balcklist Message</label>
                  <Select placeholder="Selecione a mensagem..." isMulti options={messages?.map((message: any) => ({ value: message.id, label: message.type === "text" ? <ReactMarkdown className="truncate overflow-hidden">{message.text}</ReactMarkdown> : <div className="flex items-center gap-4"><img src={message.sticker ? message.stickerUrl : message.media} width="64" height="64" /><span>{message.type}</span></div> }))} onChange={(e: any) => setBalcklistMessagesSelected(e.map((m: any) => m.value))} />
                </div>
              )}
              {includesTextB && (
                <div>
                  <label htmlFor="textToMatchB">Text to match</label>
                  {textsToMatchB.map((text, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <input type="text" value={text} onChange={(e) => {
                        setTextsToMatchB(textsToMatchB => {
                          const texts = textsToMatchB
                          texts[index] = (e.target as any).value
                          return texts
                        })
                      }} />
                      <button type="button" onClick={() => {
                        setTextsToMatchB(textsToMatchB => textsToMatchB.filter((_, i) => i !== index))
                      }}>X</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    setTextsToMatchB(textsToMatchB => [...textsToMatchB, ""])
                  }}>Adicionar</button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="quantity">Quantidade</label>
          <input type="number" id="quantity" min={1} onChange={(e) => setQuantity(parseInt((e.target as any).value))} />
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="message">Message</label>
          <input type="text" id="message" onChange={(e) => setMessage((e.target as any).value)} />
        </div>
        <div>
          <button type="submit">Criar</button>
          <a href="/">Cancelar</a>
        </div>
      </form>
    </div>
  )
}
