import { JSX } from "preact"
import { useParams } from "react-router-dom"
import useSWR from "swr"
import { useNavigate } from "react-router-dom"

const fetcher = async (url: string): Promise<any> => {
  const toUrl = new URL(import.meta.env.VITE_BACKEND_URL)
  toUrl.searchParams.set("h-Access-Control-Allow-Origin", "*")
  toUrl.searchParams.set("url", `http://129.148.60.94${url}`)

  return fetch(toUrl, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)
}

export default function (): JSX.Element {
  let { id } = useParams()
  const navigate = useNavigate()

  const { data, error } = useSWR(`/forwarders/${id}`, fetcher)

  const deleteNotifier = async () => {
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/forwarders/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: JSON.parse(localStorage.getItem("token")!)
      }
    })

    navigate("/")
  }

  return (
    <div>
      <h1>Repassador</h1>
      {error && <div>Failed to load</div>}
      {!data && !error && <div>Loading...</div>}
      {data && (
        <div>
          <h2>{data.name}</h2>
          <p>From chat: {data.fromChatId}</p>
          <p>To chat: {data.toChatId}</p>
          <p>Rule: {JSON.stringify(data.rule)}</p>

          <button onClick={deleteNotifier}>Deletar</button>
        </div>
      )}
    </div>
  )
}
