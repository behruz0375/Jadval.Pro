// ============================================================
// AI yordamchi — chat holati store (xotira ichida).
// Panel almashtirilganda ham saqlanadi; sahifa qayta yuklansa
// yoki tab yopilsa — tozalanadi (persist qilinmagan — ataylab).
// ============================================================
import { create } from 'zustand'
import type { ChatTurn } from './llm'

export interface Msg {
  id: string
  role: 'user' | 'ai'
  text: string
  ts: number
  ok?: boolean
  tool?: boolean
}

interface AIChatState {
  msgs: Msg[]
  llmHistory: ChatTurn[]
  initialized: boolean
  setMsgs: (updater: Msg[] | ((prev: Msg[]) => Msg[])) => void
  addMsg: (msg: Msg) => void
  setHistory: (h: ChatTurn[]) => void
  reset: (welcome: Msg) => void
  init: (welcome: Msg) => void
}

export const useAIChat = create<AIChatState>((set, get) => ({
  msgs: [],
  llmHistory: [],
  initialized: false,
  setMsgs: (updater) =>
    set((s) => ({ msgs: typeof updater === 'function' ? (updater as (p: Msg[]) => Msg[])(s.msgs) : updater })),
  addMsg: (msg) => set((s) => ({ msgs: [...s.msgs, msg] })),
  setHistory: (llmHistory) => set({ llmHistory }),
  reset: (welcome) => set({ msgs: [welcome], llmHistory: [], initialized: true }),
  init: (welcome) => {
    if (!get().initialized) set({ msgs: [welcome], initialized: true })
  },
}))
