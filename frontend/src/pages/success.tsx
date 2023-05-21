import { JSX } from "preact"
import { Link } from "react-router-dom"

export default function (): JSX.Element {
  return (
    <div>
      <h1>Operação concluida com sucesso!!</h1>
      <Link to="/">Voltar</Link>
    </div>
  )
}
