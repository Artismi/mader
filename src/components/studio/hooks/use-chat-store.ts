import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: {
    isQuiz?: boolean
    briefScore?: number
    canvasSnapshot?: string
  }
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  
  // Actions
  createSession: (title: string) => string
  deleteSession: (id: string) => void
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  setActiveSession: (id: string | null) => void
  updateSessionTitle: (id: string, title: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (title: string) => {
        const id = crypto.randomUUID()
        const newSession: ChatSession = {
          id,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        }
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id
        }))
        return id
      },

      deleteSession: (id: string) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
        }))
      },

      addMessage: (sessionId, msg) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id === sessionId) {
              const newMessage: Message = {
                ...msg,
                id: crypto.randomUUID(),
                timestamp: Date.now()
              }
              return {
                ...s,
                messages: [...s.messages, newMessage],
                updatedAt: Date.now()
              }
            }
            return s
          })
        }))
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      updateSessionTitle: (id, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s))
        }))
      }
    }),
    {
      name: 'creative-os-chat-memory',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
