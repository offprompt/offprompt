'use client'

import type { DemoMessage } from 'offprompt/showcase'
import { useEffect, useRef, useState } from 'react'

import { isReport } from './reports'

/** How tall the page is drawn until it says: the form's height at the docs' width. */
const FIRST_HEIGHT = 1360

/**
 * offprompt's own page, to use, as offprompt.dev shows it: a stand-in in the frame answers its
 * write with the Written page and a fingerprint of what was typed. The buttons ask the frame
 * to fill the examples, paste a key where another belongs, or have the file hold something
 * else; the frame says how tall the page is, when it was written, and when a field holds a
 * value that is not one of the examples.
 */
export const TryThePage = () => {
  const frame = useRef<HTMLIFrameElement>(null)
  const [round, setRound] = useState(0)
  const [height, setHeight] = useState(FIRST_HEIGHT)
  const [written, setWritten] = useState(false)
  const [own, setOwn] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const send = (message: DemoMessage) => frame.current?.contentWindow?.postMessage(message, '*')

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !isReport(event.data)) return
      const report = event.data
      if (report.offprompt === 'height') setHeight(report.px)
      if (report.offprompt === 'own-value') setOwn(true)
      if (report.offprompt === 'written') setWritten(true)
    }
    window.addEventListener('message', onMessage)
    // The frame says how tall it is as it loads, which can be before this listens; asked again, it says again.
    send({ offprompt: 'measure' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const startOver = () => {
    setRound(current => current + 1)
    setWritten(false)
    setOwn(false)
    setMismatch(false)
  }

  return (
    <div className="offprompt-demo">
      <div className="offprompt-demo-controls">
        <button type="button" data-primary onClick={() => send({ offprompt: 'fill' })} disabled={written}>
          Fill with examples
        </button>
        <button type="button" onClick={() => send({ offprompt: 'mix-up' })} disabled={written}>
          Paste the wrong Stripe key
        </button>
        <label>
          <input
            type="checkbox"
            role="switch"
            checked={mismatch}
            disabled={written}
            onChange={event => {
              setMismatch(event.target.checked)
              send({ offprompt: 'mismatch', on: event.target.checked })
            }}
          />
          The file holds something else
        </label>
        <button type="button" onClick={startOver}>
          Start over
        </button>
      </div>
      <p className="offprompt-demo-note">A demo: nothing you type leaves this page. Use the examples, not your keys.</p>
      {own && (
        <p className="offprompt-demo-note" data-warn role="status">
          That isn&apos;t one of the examples. It stayed on this page, but a real key belongs only in the page offprompt
          opens on your own machine.
        </p>
      )}
      <iframe
        key={round}
        ref={frame}
        src="/samples/try.html"
        title="offprompt's page, to try: fill it, write, and compare the fingerprint"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        onLoad={() => send({ offprompt: 'measure' })}
        style={{ height: `${String(height)}px` }}
      />
    </div>
  )
}
