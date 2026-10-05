'use client'

import type { DemoMessage } from 'offprompt/showcase'
import { useEffect, useRef, useState } from 'react'

import { isReport } from './reports'

/** How tall the fields are drawn until the page says: one key's field at the docs' width. */
const FIRST_HEIGHT = 220

/**
 * A provider's fields as offprompt's page draws them, each filled with an example its checks
 * pass, in a frame. They can be changed to watch the checks; nothing is written anywhere.
 */
export const FieldPreview = ({ id, name }: { readonly id: string; readonly name: string }) => {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(FIRST_HEIGHT)

  useEffect(() => {
    const element = frame.current
    const onMessage = (event: MessageEvent) => {
      if (event.source !== element?.contentWindow || !isReport(event.data)) return
      if (event.data.offprompt === 'height') setHeight(event.data.px)
    }
    // The frame says how tall it is as it loads, which can be before this listens; asked again, it says again.
    const measure = () => {
      const message: DemoMessage = { offprompt: 'measure' }
      element?.contentWindow?.postMessage(message, '*')
    }
    window.addEventListener('message', onMessage)
    element?.addEventListener('load', measure)
    measure()
    return () => {
      window.removeEventListener('message', onMessage)
      element?.removeEventListener('load', measure)
    }
  }, [])

  return (
    <figure className="offprompt-fields">
      <iframe
        ref={frame}
        src={`/samples/providers/${id}.html`}
        title={`offprompt's fields for ${name}, each filled with an example to change`}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        style={{ height: `${String(height)}px` }}
      />
      <figcaption>
        The fields offprompt&apos;s page shows for {name}, each filled with an example. Change one to watch its
        checks.
      </figcaption>
    </figure>
  )
}
