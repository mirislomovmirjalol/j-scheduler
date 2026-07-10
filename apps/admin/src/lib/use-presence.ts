import { useEffect, useState } from "react"

type PresenceState = { prevOpen: boolean; rendered: boolean; closing: boolean }

// Keeps a conditionally-rendered element mounted for `closeDurationMs` after
// `open` goes false, so its CSS exit transition (is-closing) can play before
// the element actually unmounts — the React equivalent of the transitions-dev
// snippets' "swap .is-open for .is-closing, then remove after the close
// duration" DOM orchestration.
//
// The open/closed flip is derived during render (React's documented
// "adjusting state when a prop changes" pattern, kept in state rather than
// a ref so it stays render-safe) rather than in an effect, since it must
// apply before paint; only the actual delayed unmount — a genuine side
// effect — goes through useEffect.
export function usePresence(open: boolean, closeDurationMs: number) {
  const [state, setState] = useState<PresenceState>(() => ({
    prevOpen: open,
    rendered: open,
    closing: false,
  }))

  if (open !== state.prevOpen) {
    if (open) {
      setState({ prevOpen: open, rendered: true, closing: false })
    } else if (state.rendered) {
      setState({ ...state, prevOpen: open, closing: true })
    } else {
      setState({ ...state, prevOpen: open })
    }
  }

  useEffect(() => {
    if (!state.closing) return
    const timeout = setTimeout(() => {
      setState((s) => (s.closing ? { ...s, rendered: false, closing: false } : s))
    }, closeDurationMs)
    return () => clearTimeout(timeout)
  }, [state.closing, closeDurationMs])

  return { rendered: state.rendered, closing: state.closing, open: open && !state.closing }
}
