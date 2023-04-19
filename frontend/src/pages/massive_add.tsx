import { JSX } from "preact"
import useSWR from "swr"
import { useState } from "preact/hooks"
import Select from "react-select"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

const fetcher = (url: string) => fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const [name, setName] = useState("")
  const [fromChat, setFromChat] = useState<number | null>(null)
  const [toChat, setToChat] = useState<number | null>(null)

  const { data: chats } = useSWR("/chats", fetcher)
  const navigate = useNavigate()

  const onSubmit = async (ev: any) => {
    ev.preventDefault()

    const data = {
      name,
      fromChat,
      toChat,
    }

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/massive_add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": JSON.parse(localStorage.getItem("token")!)
        },
        body: JSON.stringify(data)
      })
      toast.success("Adição em massa iniciado!")
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
          <label htmlFor="velocity">Velocidade</label>
          <select name="velocity" id="velocity">
            <option value="1">O mais rápido possível</option>
          </select>
        </div>
        <div>
          <label htmlFor="fromChat">Chat inicial</label>
          <Select placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setFromChat(e.value)} />
        </div>
        <div>
          <label htmlFor="toChat">Chat final</label>
          <Select placeholder="Selecione o chat..." options={chats?.map((chat: any) => ({ value: chat.id, label: <div className="flex items-center gap-4"><img className="rounded-full w-10 h-10" src={` data:image/jpeg;charset=utf-8;base64,${chat.image}`} /><span>{chat.name}</span></div> }))} onChange={(e: any) => setToChat(e.value)} />
        </div>
        <div>
          <button type="submit">Confirmar</button>
        </div>
      </form>
    </div>
  )
}
