import { JSX } from "preact"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { headers: { "Content-Type": "application/json", Authorization: JSON.parse(localStorage.getItem("token")!) } }).then((res) => res.json()).then((data) => data)

export default function (): JSX.Element {
  const { data, error } = useSWR("http://localhost:8000/notifiers", fetcher)

  return (
    <div>
      <h1>Notificadores</h1>
      {error && <div>Failed to load</div>}
      {!data && !error && <div>Loading...</div>}
      {data &&data.length === 0 && <div>No notifiers found</div>}
      {data && (
        <ul>
          {data.map((notifier: any) => (
            <li key={notifier.id}>
              <a href={`/notifiers/${notifier.id}`}>{notifier.name}</a>
            </li>
          ))}
        </ul>
      )}
      <a href="/notifiers/new">New Notifier</a>
    </div>
  )
}
