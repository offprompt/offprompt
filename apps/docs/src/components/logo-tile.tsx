import type { Logo } from 'offprompt/showcase'

type Props = {
  readonly name: string
  readonly logo?: Logo | undefined
  readonly color?: string | undefined
  readonly size: number
}

/**
 * A registry logo as offprompt's page draws it beside a key: white on the brand colour when
 * the provider has one, in the text colour on a plain tile, or the provider's initial when it
 * has no logo.
 */
export const LogoTile = ({ name, logo, color, size }: Props) => (
  <svg
    className="offprompt-logo"
    data-plain={color === undefined || logo === undefined ? '' : undefined}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill={logo === undefined ? 'none' : (color ?? 'none')} />
    {logo === undefined ? (
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="currentColor">
        {name.charAt(0)}
      </text>
    ) : (
      <path
        d={logo.path}
        fill={color === undefined ? 'currentColor' : '#fff'}
        fillRule={logo.evenOdd === true ? 'evenodd' : undefined}
        transform="translate(6 6) scale(0.5)"
      />
    )}
  </svg>
)
