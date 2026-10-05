import type { ReactNode } from 'react'

type Children = { readonly children: ReactNode }

/** Fades a card's picture out at its foot, where the card cuts it off. */
export const Fade = ({ className = 'h-[100px] lg:h-[110px]' }: { readonly className?: string }) => (
  <div
    className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-b from-white/0 to-white to-85% ${className}`}
    aria-hidden="true"
  />
)

type CardProps = Children & {
  readonly eyebrow: string
  readonly title: string
  readonly id?: string
  readonly className?: string
  /** A picture only, hidden from screen readers. A card someone can use says `false`. */
  readonly decorative?: boolean
}

/** A white card: an eyebrow, a sentence, and a picture cropped at the foot, with its edge drawn over the picture. */
export const Card = ({
  eyebrow,
  title,
  id,
  className = 'h-[470px] lg:h-[520px]',
  decorative = true,
  children,
}: CardProps) => (
  <article
    id={id}
    className={`relative flex min-w-0 scroll-mt-6 flex-col gap-2.5 overflow-hidden rounded-[14px] bg-card px-4 pt-6 after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:outline after:outline-line after:-outline-offset-1 lg:gap-3 lg:rounded-2xl lg:px-8 lg:pt-[30px] ${className}`}
  >
    <p className="font-mono text-[11px] tracking-[1.2px] text-eyebrow lg:text-xs">{eyebrow}</p>
    <h3 className="text-lg leading-[25px] text-ink lg:text-[21px] lg:leading-[29px]">{title}</h3>
    <div className="relative min-h-0 flex-1 overflow-hidden" aria-hidden={decorative ? 'true' : undefined}>
      {children}
    </div>
  </article>
)
