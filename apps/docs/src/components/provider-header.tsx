import { categoryLabels, providers } from 'offprompt/showcase'

import { LogoTile } from './logo-tile'

/** Under a provider's name at the top of its page: its logo, what it is for, and its site. */
export const ProviderHeader = ({ id }: { readonly id: string }) => {
  const provider = providers.find(candidate => candidate.id === id)
  if (provider === undefined) throw new Error(`offprompt's registry has no provider ${id}`)
  return (
    <div className="offprompt-provider-header">
      <LogoTile name={provider.name} logo={provider.logo} color={provider.color} size={44} />
      <div>
        <a href={`/reference/providers#${provider.category}`}>{categoryLabels[provider.category]}</a>
        <a href={provider.homepage}>{new URL(provider.homepage).host}</a>
      </div>
    </div>
  )
}
