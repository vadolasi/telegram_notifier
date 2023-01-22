import { JSX } from "preact"
import useSWR from "swr"

const fetcher = (url: string) => fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const { data: notifiers, error } = useSWR("/notifiers", fetcher)
  const { data: forwarders, error: errorForwarders } = useSWR("/forwarders", fetcher)

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
              <a href={`/notifiers/${notifier.id}`}>{notifier.name}</a>
            </li>
          ))}
        </ul>
      )}
      <a href="/notifiers/new">New Notifier</a>
      <h1>Repassadores</h1>
      {errorForwarders && <div>Failed to load</div>}
      {!forwarders && !errorForwarders && <div>Loading...</div>}
      {forwarders && forwarders.length === 0 && <div>No forwarders found</div>}
      {forwarders && (
        <ul>
          {forwarders.map((forwarder: any) => (
            <li key={forwarder.id}>
              <a href={`/forwarders/${forwarder.id}`}>{forwarder.name}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
