import { useState } from "preact/hooks"
import { Route } from "react-router-dom"

export default function(): JSX.Element {
  const [phone, setPhone] = useState<string>("")

  return (
    <div>
      <label htmlFor="phone">Phone (ex: +5511988888888)</label>
      <input type="number" id="phone" value={phone} onChange={e => setPhone((e.target as any).value)} />
      <Route path={`/verify?phone=${phone}`} />
    </div>
  )
}
