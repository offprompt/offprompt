/** Structured data for search engines and the assistants that read a page, as a JSON-LD script. */
export const JsonLd = ({ data }: { readonly data: object }) => (
  <script
    type="application/ld+json"
    // JSON in a script tag ends at the first "</script", so every < is escaped.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll('<', '\\u003c') }}
  />
)
