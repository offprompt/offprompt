# Registry

Providers, the keys they issue, and kinds of value no one provider owns. Every entry is
plain data checked against `schema.ts`, and nothing here imports from the rest of offprompt,
so the folder can move to a repository of its own.

```
schema.ts            the shape of every entry, as Zod schemas
checks.ts            how a value is checked against a rule
formats.ts           kinds of value no one provider owns, such as postgres_url
examples.ts          a value each key and format accepts, for a page that is shown rather than used
registry.ts          every provider, and lookups by env name and reference
providers/
  stripe/
    provider.ts      name, homepage, logo, colour, domains, keys, and formats it can create
    secret-key.ts    one file per key: label, env names, where it is made, rules
    publishable-key.ts
    webhook-secret.ts
    logo.ts          one SVG path, drawn in the text colour, or white on the colour
    stripe.test.ts   values each key accepts and refuses
```

## Adding a provider

1. Add a folder under `providers/` named after it, with `provider.ts`, a file per key,
   `logo.ts` and a test.
2. Add it to the list in `registry.ts`.
3. Run the tests. `registry.test.ts` parses every entry against the schema, and fails when
   a link leaves the provider's domains, when two keys claim the same env name, or when an
   offer names a format that does not exist.

Keep rules loose, a prefix and a wide length range, because a rule that goes stale blocks
a valid key. Take logos from Simple Icons where it has them; any other source needs its
licence in `THIRD_PARTY_NOTICES.md`.
