import { REPO } from './site'

const API = REPO.replace('https://github.com/', 'https://api.github.com/repos/')

const isRepo = (body: unknown): body is { stargazers_count: number } =>
  typeof body === 'object' &&
  body !== null &&
  'stargazers_count' in body &&
  typeof body.stargazers_count === 'number'

/** 2140 reads 2.1k, as the nav shows it. */
export const shortCount = (count: number) =>
  count < 1000 ? String(count) : `${(count / 1000).toFixed(count < 10000 ? 1 : 0).replace(/\.0$/, '')}k`

/** The repository's stars, refreshed hourly; nothing while the repository cannot be read. */
export const stars = async () => {
  const response = await fetch(API, {
    headers: { accept: 'application/vnd.github+json' },
    next: { revalidate: 3600 },
  }).catch(() => undefined)
  if (response?.ok !== true) return undefined
  const body: unknown = await response.json()
  return isRepo(body) ? shortCount(body.stargazers_count) : undefined
}
