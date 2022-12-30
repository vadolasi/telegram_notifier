import { JSX } from "preact"
import { useEffect, useState } from "preact/hooks"
import io from "socket.io-client"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useLocalStorage } from "../../utils"

const socket = io("http://localhost:8000", { transports: ["websocket", "polling"] })

export default function (): JSX.Element {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState("")
  const [requestPassword, setRequestPassword] = useState(false)
  const [password, setPassword] = useState("")
  const navigate = useNavigate()
  const [, setToken] = useLocalStorage("token")

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true)

      socket.emit("verify", searchParams.get("phone"))
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.on("password", () => {
      setRequestPassword(true)
    })

    socket.on("success", (token: string) => {
      setToken(token)
      navigate("/success")
    })

    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("pong")
    }
  }, [])

  return (
    <div>
      {isConnected ? (
        <>
          {requestPassword ? (
            <>
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword((e.target as any).value)} />
              <button onClick={() => socket.emit("password", password)}>Verify</button>
            </>
          ) : (
            <>
              <label htmlFor="code">Code</label>
              <input type="number" id="code" value={code} onChange={(e) => setCode((e.target as any).value)} />
              <button onClick={() => socket.emit("code", code)}>Verify</button>
            </>
          )}
        </>
      ) : (
        <div>Connecting...</div>
      )}
    </div>
  )
}
