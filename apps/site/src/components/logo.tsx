import type { Logo } from 'offprompt/showcase'

type Props = { readonly logo: Logo; readonly color?: string | undefined; readonly className?: string }

/** A registry logo, one path on a 24×24 grid, in its brand colour or the text colour. */
export const LogoMark = ({ logo, color, className }: Props) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d={logo.path} fill={color ?? 'currentColor'} fillRule={logo.evenOdd === true ? 'evenodd' : undefined} />
  </svg>
)

type TileProps = Omit<Props, 'logo'> & { readonly name: string; readonly logo?: Logo | undefined }

/**
 * The tile offprompt's page puts beside a key: white on the brand colour when the provider
 * has one, the logo in the text colour on a plain tile, or the provider's initial when it has
 * no logo.
 */
export const LogoTile = ({ name, logo, color, className }: TileProps) =>
  logo === undefined ? (
    <span
      className={`flex items-center justify-center rounded-lg text-[13px] font-semibold text-ink outline outline-line -outline-offset-1 ${className ?? ''}`}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </span>
  ) : color === undefined ? (
    <span
      className={`flex items-center justify-center rounded-lg text-ink outline outline-line -outline-offset-1 ${className ?? ''}`}
    >
      <LogoMark logo={logo} className="size-[58%]" />
    </span>
  ) : (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill={color} />
      <path
        d={logo.path}
        fill="#fff"
        transform="translate(6 6) scale(0.5)"
        fillRule={logo.evenOdd === true ? 'evenodd' : undefined}
      />
    </svg>
  )
