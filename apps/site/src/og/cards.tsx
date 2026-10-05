/*
 * The social cards, as the design file draws them, for ImageResponse to render: the site's
 * card, the docs' card with its slots, GitHub's preview and the square logo. ImageResponse
 * lays out with flexbox alone, so every box with more than one child says so.
 */
import type { CSSProperties, ReactNode } from 'react'
import { clients, type Logo } from 'offprompt/showcase'

import { MARK_PATHS } from '@/components/marks'
import { provider } from '@/lib/registry'

const INK = '#12332A'
const BODY = '#4D6158'
const MUTED = '#8A968F'
const LINE = '#E4E6E1'
const PAPER = '#FBFBF9'
const PANEL = '#F3F4F1'
const BRAND = '#2B4A3B'

const GEIST = 'Geist'
const MONO = 'JetBrains Mono'

/** offprompt's mark at a size, in one colour. */
const Mark = ({ width, height, color }: { width: number; height: number; color: string }) => (
  <svg width={width} height={height} viewBox="0 0 43 21">
    {MARK_PATHS.map(path => (
      <path key={path} d={path} fill={color} fillRule="evenodd" />
    ))}
  </svg>
)

/** Lucide's icons as lines on a 24×24 grid. lucide-react's own components run only in a browser. */
const Icon = ({ size, color, strokeWidth, children }: { size: number; color: string; strokeWidth: number; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

const Lock = ({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) => (
  <Icon size={size} color={color} strokeWidth={strokeWidth}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
)

const Plus = ({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) => (
  <Icon size={size} color={color} strokeWidth={strokeWidth}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Icon>
)

/** A registry logo, one path on a 24×24 grid, in one colour. */
const LogoMark = ({ logo, size, color }: { logo: Logo; size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d={logo.path} fill={color} fillRule={logo.evenOdd === true ? 'evenodd' : undefined} />
  </svg>
)

/** A registry logo white on its brand colour, the tile offprompt's page puts beside a key. */
const LogoTile = ({ logo, size, color }: { logo: Logo; size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect width="24" height="24" rx="6" fill={color} />
    <path
      d={logo.path}
      fill="#fff"
      transform="translate(6 6) scale(0.5)"
      fillRule={logo.evenOdd === true ? 'evenodd' : undefined}
    />
  </svg>
)

const claudeCode = clients.find(client => client.id === 'claude-code')
const stripe = provider('stripe')
const vercel = provider('vercel')

/** A vertical hairline the full height of a card, as the site's frame draws its edges. */
const Rail = ({ left, height, color }: { left: number; height: number; color: string }) => (
  <div style={{ position: 'absolute', left, top: 0, width: 1, height, backgroundColor: color }} />
)

const text = (style: CSSProperties): CSSProperties => ({ display: 'flex', whiteSpace: 'nowrap', ...style })

/** A key on the mock page: its logo and name, and the empty field below. */
const MockField = ({ mark, name, placeholder }: { mark: ReactNode; name: string; placeholder: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {mark}
      <div style={text({ fontFamily: MONO, fontSize: 11.5, color: '#111111' })}>{name}</div>
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: 34,
        padding: '0 12px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D3CEC2',
        borderRadius: 6,
      }}
    >
      <div style={text({ fontFamily: MONO, fontSize: 12.5, color: '#6B6760' })}>{placeholder}</div>
    </div>
  </div>
)

/** offprompt's page in a browser window, asking for the two keys the site's hero asks for. */
const MockPage = () => (
  <div
    style={{
      position: 'absolute',
      left: 40,
      top: 56,
      width: 440,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#F1EEE6',
      border: '1px solid #D3CEC2',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0px 12px 32px #12332A1A',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 44,
        padding: '0 14px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #D3CEC2',
      }}
    >
      {[0, 1, 2].map(light => (
        <div key={light} style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: '#D3CEC2' }} />
      ))}
      <div style={{ display: 'flex', padding: '6px 10px', backgroundColor: '#F1EEE6', borderRadius: 6 }}>
        <div style={text({ fontFamily: GEIST, fontSize: 11, color: '#111111' })}>Claude Code · offprompt</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
        <Lock size={10} color="#6B6760" strokeWidth={2.5} />
        <div style={text({ fontFamily: MONO, fontSize: 11, color: '#6B6760' })}>127.0.0.1:4123</div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 22px 18px 22px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {claudeCode?.logo === undefined ? null : (
            <LogoMark logo={claudeCode.logo} size={18} color={claudeCode.color ?? '#D97757'} />
          )}
          <div
            style={text({ fontFamily: GEIST, fontWeight: 500, fontSize: 17, letterSpacing: -0.3, color: '#111111' })}
          >
            Claude Code is asking for two values.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 27 }}>
          <div style={text({ fontFamily: GEIST, fontSize: 12, color: '#6B6760' })}>Writes to</div>
          <div style={text({ fontFamily: MONO, fontWeight: 500, fontSize: 12.5, color: '#111111' })}>.env.local</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stripe.logo === undefined ? null : (
          <MockField
            mark={<LogoTile logo={stripe.logo} size={13} color={stripe.color ?? '#635BFF'} />}
            name="STRIPE_WEBHOOK_SECRET"
            placeholder="whsec_…"
          />
        )}
        {vercel.logo === undefined ? null : (
          <MockField mark={<LogoMark logo={vercel.logo} size={12} color="#111111" />} name="VERCEL_TOKEN" placeholder="24 characters" />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 34,
          backgroundColor: '#111111',
          borderRadius: 6,
          opacity: 0.35,
        }}
      >
        <div style={text({ fontFamily: GEIST, fontWeight: 500, fontSize: 13.5, color: '#F1EEE6' })}>Write it</div>
      </div>
    </div>
  </div>
)

/** The site's card, 1200×630: the headline and command on the left, the page asking on the right. */
export const SiteCard = () => (
  <div style={{ display: 'flex', position: 'relative', width: 1200, height: 630, backgroundColor: PAPER, overflow: 'hidden' }}>
    <Rail left={64} height={630} color={LINE} />
    <div
      style={{
        position: 'absolute',
        left: 676,
        top: 64,
        width: 600,
        height: 640,
        display: 'flex',
        backgroundColor: PANEL,
        border: `1px solid ${LINE}`,
        borderRadius: 24,
      }}
    >
      <MockPage />
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 394,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          backgroundColor: '#FFFFFF',
          border: `1px solid ${LINE}`,
          borderRadius: 999,
          boxShadow: '0px 10px 28px #12332A1F',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: '#2F9E5B' }} />
        <div style={text({ fontFamily: GEIST, fontSize: 17, color: BODY })}>Secret values in the transcript:</div>
        <div style={text({ fontFamily: MONO, fontWeight: 600, fontSize: 18, color: INK })}>0</div>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 96, top: 62, display: 'flex', alignItems: 'center', gap: 14 }}>
      <Mark width={50} height={24} color={INK} />
      <div style={text({ fontFamily: GEIST, fontWeight: 500, fontSize: 30, letterSpacing: -0.6, color: INK })}>offprompt</div>
    </div>
    <div
      style={{
        position: 'absolute',
        left: 96,
        top: 150,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: GEIST,
        fontSize: 80,
        lineHeight: '82px',
        letterSpacing: -2.6,
        color: INK,
      }}
    >
      <div style={text({})}>Keep secrets</div>
      <div style={text({})}>off the prompt.</div>
    </div>
    <div
      style={{
        position: 'absolute',
        left: 96,
        top: 338,
        width: 520,
        display: 'flex',
        fontFamily: GEIST,
        fontSize: 24,
        lineHeight: '35px',
        color: BODY,
      }}
    >
      Your agent asks, a page opens on your machine, and the value goes straight into the file. The model only sees
      the key name.
    </div>
    <div
      style={{
        position: 'absolute',
        left: 96,
        top: 494,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 22px',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${LINE}`,
        borderRadius: 12,
      }}
    >
      <div style={text({ fontFamily: MONO, fontSize: 22, color: MUTED })}>$</div>
      <div style={text({ fontFamily: MONO, fontSize: 22, color: INK })}>npx offprompt init</div>
    </div>
  </div>
)

/** What a docs page's card shows: the sidebar group it is in, its title and its description. */
export type DocsPage = { readonly section: string; readonly title: string; readonly description: string }

/** A docs page's card, 1200×630, its title up to three lines and its description up to two. */
export const DocsCard = ({ section, title, description }: DocsPage) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      width: 1200,
      height: 630,
      backgroundColor: PAPER,
      overflow: 'hidden',
    }}
  >
    <Rail left={64} height={630} color={LINE} />
    <Rail left={1135} height={630} color={LINE} />
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 1200,
        height: 112,
        padding: '0 96px',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Mark width={44} height={21} color={INK} />
        <div style={text({ fontFamily: GEIST, fontWeight: 500, fontSize: 28, letterSpacing: -0.6, color: INK })}>offprompt</div>
        <div
          style={{ display: 'flex', padding: '5px 14px', backgroundColor: PANEL, border: `1px solid ${LINE}`, borderRadius: 999 }}
        >
          <div style={text({ fontFamily: GEIST, fontSize: 19, color: BODY })}>Docs</div>
        </div>
      </div>
      <div style={text({ fontFamily: MONO, fontSize: 19, color: MUTED })}>docs.offprompt.dev</div>
    </div>
    <div style={{ position: 'absolute', left: 57, top: 105, display: 'flex' }}>
      <Plus size={15} color="#B5BDB8" strokeWidth={2} />
    </div>
    <div style={{ position: 'absolute', left: 1128, top: 105, display: 'flex' }}>
      <Plus size={15} color="#B5BDB8" strokeWidth={2} />
    </div>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 20,
        flexGrow: 1,
        padding: '48px 96px 68px 96px',
      }}
    >
      <div
        style={text({ fontFamily: MONO, fontSize: 18, letterSpacing: 2.2, textTransform: 'uppercase', color: '#2E7D53' })}
      >
        {section}
      </div>
      <div
        style={{
          display: 'block',
          lineClamp: 3,
          fontFamily: GEIST,
          fontSize: 76,
          lineHeight: '81px',
          letterSpacing: -2.3,
          color: INK,
        }}
      >
        {title}
      </div>
      {description === '' ? null : (
        <div style={{ display: 'block', lineClamp: 2, fontFamily: GEIST, fontSize: 25, lineHeight: '36px', color: BODY }}>
          {description}
        </div>
      )}
    </div>
  </div>
)

/** GitHub's social preview, 1280×640, dark: the mark on its tile, the name and the command. */
export const GitHubCard = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: 1280,
      height: 640,
      backgroundColor: '#111312',
      overflow: 'hidden',
    }}
  >
    <Rail left={64} height={640} color="#2A2E2C" />
    <Rail left={1215} height={640} color="#2A2E2C" />
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 112,
        height: 112,
        backgroundColor: BRAND,
        border: '1px solid #3A5A4A',
        borderRadius: 26,
      }}
    >
      <Mark width={62} height={30} color="#FFFFFF" />
    </div>
    <div
      style={text({
        marginTop: 36,
        fontFamily: GEIST,
        fontWeight: 500,
        fontSize: 100,
        lineHeight: '100px',
        letterSpacing: -3.4,
        color: '#F1F3F1',
      })}
    >
      offprompt
    </div>
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 24,
        width: 800,
        fontFamily: GEIST,
        fontSize: 30,
        lineHeight: '42px',
        textAlign: 'center',
        color: '#A2AAA5',
      }}
    >
      Hand a secret to a coding agent without the secret entering the transcript.
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 44 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '13px 18px',
          backgroundColor: '#000000',
          border: '1px solid #2A2E2C',
          borderRadius: 10,
        }}
      >
        <div style={text({ fontFamily: MONO, fontSize: 21, color: '#8C938F' })}>$</div>
        <div style={text({ fontFamily: MONO, fontSize: 21, color: '#7CF5C2' })}>npx offprompt init</div>
      </div>
      <div style={text({ fontFamily: GEIST, fontSize: 21, color: '#8C938F' })}>MCP server · MIT licensed</div>
    </div>
  </div>
)

/** The square logo, full bleed at any size: directories and home screens put their own corners on it. */
export const SquareLogo = ({ size }: { size: number }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      backgroundColor: BRAND,
    }}
  >
    <Mark width={(size * 288) / 512} height={(size * 140) / 512} color="#FFFFFF" />
  </div>
)
