import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { useNavigate } from "react-router-dom"

const schema = yup.object({
  email: yup.string().required(),
  password: yup.string().required()
}).required()

export default function (): JSX.Element {
  const { register, handleSubmit, formState:{ errors } } = useForm({
    resolver: yupResolver(schema)
  })
  const navigate = useNavigate()

  const onSubmit = handleSubmit(async (data) => {
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })

      navigate("/")
    } catch (error) {
      console.error(error)
    }
  })

  return (
    <div>
      <h1>Login</h1>
      {/* @ts-ignore */}
      <form onSubmit={onSubmit}>
        <div className="flex flex-col">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" {...register("email")} />
          {errors.email && <p>{errors.email.message}</p>}
        </div>
        <div className="flex flex-col">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" {...register("password")} />
          {errors.password && <p>{errors.password.message}</p>}
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  )
}
