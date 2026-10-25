import Script from 'next/script'

// Umami Cloud's website for offprompt.dev. Public by design: it ships in the page.
const UMAMI_WEBSITE_ID = '649f4432-01a3-439e-812f-7f824af2f256'

// Umami is reached through the site's own origin, which ad blockers leave alone: the script is a
// rewrite (next.config.ts), the events a route handler (app/op/api/send).
const UMAMI_PATH = '/op'

/**
 * Umami's tracker, on the production site alone, since previews would count as visits. It
 * double-checks the domain itself, honours Do Not Track, and sends Core Web Vitals along with
 * page views.
 */
export const Analytics = () =>
  process.env.VERCEL_ENV === 'production' ? (
    <Script
      src={`${UMAMI_PATH}/script.js`}
      strategy="afterInteractive"
      data-website-id={UMAMI_WEBSITE_ID}
      data-host-url={UMAMI_PATH}
      data-domains="offprompt.dev"
      data-do-not-track="true"
      data-performance="true"
    />
  ) : null
