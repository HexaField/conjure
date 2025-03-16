import { useEffect } from 'react'

export const useSearchParam = (key: string, value: string | object | number | boolean) => {
  useEffect(() => {
    if (!key || !value) return
    const parsed = new URL(window.location.href)
    const query = parsed.searchParams
    query.set(key, typeof value === 'object' ? JSON.stringify(value) : `${value}`)
    parsed.search = query.toString()
    window.history.replaceState({}, '', parsed.toString())
    return () => {
      const parsed = new URL(window.location.href)
      const query = parsed.searchParams
      query.delete(key)
      parsed.search = query.toString()
      window.history.replaceState({}, '', parsed.toString())
    }
  }, [key, value])
}
