import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type Tone = 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  tone: Tone
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), tone === 'error' ? 6000 : 3200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex max-w-md animate-rise items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ${
              item.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-white'
            }`}
          >
            {item.tone === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} className="text-saffron" />}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
