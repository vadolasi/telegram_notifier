import { JSX } from "preact"
import useSWR from "swr"

const fetcher = async (url: string): Promise<any> => {
  const toUrl = new URL(import.meta.env.VITE_BACKEND_URL)
  toUrl.searchParams.set("h-Access-Control-Allow-Origin", "*")
  toUrl.searchParams.set("url", `http://129.148.60.94${url}`)

  return fetch(toUrl, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)
}

export default function (): JSX.Element {
  const { data: notifiers, error } = useSWR("/notifiers", fetcher)
  const { data: forwarders, error: errorForwarders } = useSWR("/forwarders", fetcher)
  const { data: phones, error: errorPhones } = useSWR("/phones", fetcher)

  return (
    <div>
      <h1>Notificadores</h1>
      {error && <div>Failed to load</div>}
      {!notifiers && !error && <div>Loading...</div>}
      {notifiers && notifiers.length === 0 && <div>No notifiers found</div>}
      {notifiers && (
        <ul>
          {notifiers.map((notifier: any) => (
            <li key={notifier.id}>
              <a href={`/notifiers/${notifier.id}`}>{notifier.name || "<Sem nome>"}</a>
            </li>
          ))}
        </ul>
      )}
      <a href="/notifiers/new">Novo notificador</a>
      <h1>Repassadores</h1>
      {errorForwarders && <div>Failed to load</div>}
      {!forwarders && !errorForwarders && <div>Loading...</div>}
      {forwarders && forwarders.length === 0 && <div>No forwarders found</div>}
      {forwarders && (
        <ul>
          {forwarders.map((forwarder: any) => (
            <li key={forwarder.id}>
              <a href={`/forwarders/${forwarder.id}`}>{forwarder.name || "<Sem nome>"}</a>
            </li>
          ))}
        </ul>
      )}
      <a href="/forwarders/new">Novo repassador</a>
      <h1>Números</h1>
      {errorPhones && <div>Failed to load</div>}
      {!phones && !errorPhones && <div>Loading...</div>}
      {phones && phones.length === 0 && <div>No phones found</div>}
      {phones && (
        <ul>
          {phones.map((phone: any) => (
            <li key={phone.id}>
              {phone.phoneNumber}
            </li>
          ))}
        </ul>
      )}
      <a href="/addPhone">Novo número</a>
      <br/>
      <br/>
      <a href="/massive_add">Adicionar membros em massa</a>
    </div>
  )
}
