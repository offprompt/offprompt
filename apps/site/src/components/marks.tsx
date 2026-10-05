/*
 * offprompt's own mark, and GitHub's for the nav. Every provider's and agent's logo comes
 * from offprompt's registry instead, as its page draws them.
 */

type MarkProps = { readonly className?: string }

/** offprompt's mark: three dots and a ring, in the current colour. */
export const OffpromptMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 43 21" className={className} fill="currentColor" aria-hidden="true">
    <path d="M5 11c2.76 0 5 2.24 5 5 0 2.76-2.24 5-5 5-2.76 0-5-2.24-5-5 0-2.76 2.24-5 5-5z" fillRule="evenodd" />
    <path d="M16 0c2.76 0 5 2.24 5 5 0 2.76-2.24 5-5 5-2.76 0-5-2.24-5-5 0-2.76 2.24-5 5-5z m0 2.25c1.518 0 2.75 1.232 2.75 2.75 0 1.518-1.232 2.75-2.75 2.75-1.518 0-2.75-1.232-2.75-2.75 0-1.518 1.232-2.75 2.75-2.75z" fillRule="evenodd" />
    <path d="M27 11c2.76 0 5 2.24 5 5 0 2.76-2.24 5-5 5-2.76 0-5-2.24-5-5 0-2.76 2.24-5 5-5z" fillRule="evenodd" />
    <path d="M38 11c2.76 0 5 2.24 5 5 0 2.76-2.24 5-5 5-2.76 0-5-2.24-5-5 0-2.76 2.24-5 5-5z" fillRule="evenodd" />
  </svg>
)

/** GitHub, drawn as Lucide drew it before its brand icons went. */
export const GitHubMark = ({ className }: MarkProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)
