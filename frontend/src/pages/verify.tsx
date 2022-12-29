import { JSX } from "preact"
import { useEffect, useState } from "preact/hooks"
import io from "socket.io-client"
import parser from "socket.io-msgpack-parser"
import { useSearchParams, useNavigate } from "react-router-dom"

const socket = io("http://localhost:8000", { transports: ["websocket", "polling"] })

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function (): JSX.Element {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState("")
  const [requestPassword, setRequestPassword] = useState(false)
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

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

    socket.on("success", () => {
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
