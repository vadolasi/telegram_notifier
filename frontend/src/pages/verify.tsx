import { JSX } from "preact"
import { useEffect, useRef, useState } from "preact/hooks"
import io, { Socket } from "socket.io-client"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useLocalStorage } from "../../utils"

export default function (): JSX.Element {
  const [isConnected, setIsConnected] = useState(false)
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState("")
  const [requestPassword, setRequestPassword] = useState(false)
  const [password, setPassword] = useState("")
  const navigate = useNavigate()
  const [, setToken] = useLocalStorage("token")
  const socket = useRef<Socket>()

  useEffect(() => {
    socket.current = io("http://localhost:8000", { transports: ["websocket", "polling"] })

    socket.current.on("connect", () => {
      setIsConnected(true)

      socket.current?.emit("verify", searchParams.get("phone"))
    })

    socket.current.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.current.on("password", () => {
      setRequestPassword(true)
    })

    socket.current.on("success", (token: string) => {
      setToken(token)
      navigate("/success")
    })

    return () => {
      socket.current?.off("connect")
      socket.current?.off("disconnect")
      socket.current?.off("password")
      socket.current?.off("success")
      socket.current?.disconnect()
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
              <button onClick={() => socket.current?.emit("password", password)}>Verify</button>
            </>
          ) : (
            <>
              <label htmlFor="code">Code</label>
              <input type="number" id="code" value={code} onChange={(e) => setCode((e.target as any).value)} />
              <button onClick={() => socket.current?.emit("code", code)}>Verify</button>
            </>
          )}
        </>
      ) : (
        <div>Connecting...</div>
      )}
    </div>
  )
}
