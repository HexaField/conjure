import { useEffect } from 'react'

export const useSearchParam = (key: string, value: string) => {
  useEffect(() => {
    if (!key || !value) return
    const parsed = new URL(window.location.href)
    const query = parsed.searchParams
    query.set(key, typeof value === 'string' ? value : JSON.stringify(value))
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
