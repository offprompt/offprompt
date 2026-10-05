'use client'

import type { Category, Logo } from 'offprompt/showcase'
import { useState } from 'react'

import { LogoTile } from './logo-tile'

/** One provider as the catalogue shows it. Plain data, for the page's script. */
export type CatalogueEntry = {
  readonly id: string
  readonly name: string
  readonly category: Category
  readonly logo?: Logo | undefined
  readonly color?: string | undefined
  /** The env name each of its keys usually goes by, or the formats it makes. */
  readonly keys: readonly string[]
}

export type CatalogueSection = { readonly category: Category; readonly label: string }

/** Whether a provider answers to what was typed: its name, its id, or a variable it is read as. */
const matches = ({ entry, query }: { entry: CatalogueEntry; query: string }) => {
  const words = query.trim().toLowerCase()
  if (words === '') return true
  return [entry.name, entry.id, ...entry.keys].some(text => text.toLowerCase().includes(words))
}

const Card = ({ entry }: { readonly entry: CatalogueEntry }) => {
  const [first, ...rest] = entry.keys
  return (
    <a className="offprompt-catalogue-card" href={`/reference/providers/${entry.id}`}>
      <LogoTile name={entry.name} logo={entry.logo} color={entry.color} size={36} />
      <span>
        <strong>{entry.name}</strong>
        {first !== undefined && (
          <code>
            {first}
            {rest.length > 0 && <small> +{rest.length}</small>}
          </code>
        )}
      </span>
    </a>
  )
}

/**
 * Every provider in the registry, a section per category, narrowed by a search for a name or
 * a variable and by a category. Each card opens the provider's page.
 */
export const CatalogueGrid = ({
  entries,
  sections,
}: {
  readonly entries: readonly CatalogueEntry[]
  readonly sections: readonly CatalogueSection[]
}) => {
  const [query, setQuery] = useState('')
  const [only, setOnly] = useState<Category | undefined>(undefined)
  const shown = sections
    .filter(section => only === undefined || section.category === only)
    .map(section => ({
      ...section,
      entries: entries.filter(entry => entry.category === section.category && matches({ entry, query })),
    }))
    .filter(section => section.entries.length > 0)

  return (
    <div className="offprompt-catalogue">
      <div className="offprompt-catalogue-controls">
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search by name or variable, such as STRIPE_SECRET_KEY"
          aria-label="Search providers"
        />
        <div role="group" aria-label="Category">
          <button type="button" aria-pressed={only === undefined} onClick={() => setOnly(undefined)}>
            All <small>{entries.length}</small>
          </button>
          {sections.map(section => (
            <button
              key={section.category}
              type="button"
              aria-pressed={only === section.category}
              onClick={() => setOnly(only === section.category ? undefined : section.category)}
            >
              {section.label} <small>{entries.filter(entry => entry.category === section.category).length}</small>
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && <p className="offprompt-catalogue-none">No provider matches “{query.trim()}”.</p>}
      {shown.map(section => (
        <section key={section.category} id={section.category}>
          <h2>{section.label}</h2>
          <div className="offprompt-catalogue-cards">
            {section.entries.map(entry => (
              <Card key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
