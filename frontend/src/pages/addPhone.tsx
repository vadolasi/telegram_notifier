import { useState } from "preact/hooks"
import { Link } from "react-router-dom"

export default function(): JSX.Element {
  const [phone, setPhone] = useState<string>("")

  return (
    <div>
      <label htmlFor="phone">Phone (ex: +5511988888888)</label>
      <input type="number" id="phone" value={phone} onChange={e => setPhone((e.target as any).value)} />
      <Link to={`/verify?phone=${phone}`}>Verificar</Link>
    </div>
  )
}
