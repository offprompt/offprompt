import { categoryLabels, providers, type Category } from 'offprompt/showcase'

import { CatalogueGrid, type CatalogueEntry, type CatalogueSection } from './catalogue-grid'

const entries: readonly CatalogueEntry[] = [...providers]
  .sort((left, right) => left.name.localeCompare(right.name))
  .map(provider => ({
    id: provider.id,
    name: provider.name,
    category: provider.category,
    logo: provider.logo,
    color: provider.color,
    keys:
      provider.credentials.length > 0
        ? provider.credentials.flatMap(credential => credential.names.slice(0, 1))
        : provider.offers.map(offer => offer.format),
  }))

const isCategory = (value: string): value is Category => Object.hasOwn(categoryLabels, value)

/** The categories in the registry's order, each that has a provider in it. */
const sections: readonly CatalogueSection[] = Object.entries(categoryLabels)
  .flatMap(([category, label]) => (isCategory(category) ? [{ category, label }] : []))
  .filter(section => entries.some(entry => entry.category === section.category))

/** The registry's providers, read here so that only plain data reaches the page's script. */
export const ProviderCatalogue = () => <CatalogueGrid entries={entries} sections={sections} />
