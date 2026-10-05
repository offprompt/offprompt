import 'react'

/** Custom properties set inline, such as a picture's height for the stylesheet to scale. */
declare module 'react' {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined
  }
}
