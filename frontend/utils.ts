import { useEffect, useState } from "preact/hooks"

export function useLocalStorage(key: string, defaultValue: any = null) {
  const [value, setValue] = useState<string | null>(defaultValue)

  useEffect(() => {
    setValue(JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultValue)))
  }, [])

  const set = (value: string) => {
    localStorage.setItem(key, JSON.stringify(value))
    setValue(value)

    return value
  }

  return [value, set] as const
}
