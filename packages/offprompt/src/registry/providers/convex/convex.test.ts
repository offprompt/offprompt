import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { deployKey } from './deploy-key.js'
import { deploymentUrl } from './deployment-url.js'

const TOKEN = `eyJ2${'a'.repeat(60)}=`
const SHAPE = 'a deploy key, such as prod:name|…'

describe('Convex deploy key', () => {
  it('accepts a production, development, preview or project key', () => {
    expect(failures(deployKey.rules, `prod:example-animal-123|${TOKEN}`)).toEqual([])
    expect(failures(deployKey.rules, `dev:example-animal-123|${TOKEN}`)).toEqual([])
    expect(failures(deployKey.rules, `preview:example-team:example-project|${TOKEN}`)).toEqual([])
    expect(failures(deployKey.rules, `project:example-team:example-project|${TOKEN}`)).toEqual([])
  })

  it('accepts the admin key of a deployment, which has no type in front', () => {
    expect(failures(deployKey.rules, `example-animal-123|${'0123456789abcdef'.repeat(4)}`)).toEqual([])
  })

  it('refuses the CONVEX_DEPLOYMENT value, which starts the same way but has no key after the name', () => {
    expect(failures(deployKey.rules, 'dev:example-animal-123')).toEqual([SHAPE, 'at least 40 characters'])
    expect(failures(deployKey.rules, `dev:${'example-animal-'.repeat(3)}`)).toEqual([SHAPE])
  })

  it('refuses the deployment URL and another provider key where the deploy key goes', () => {
    expect(failures(deployKey.rules, 'https://example-sleepy-animal-1234.convex.cloud')).toEqual([SHAPE])
    expect(failures(deployKey.rules, `sk_live_${'a'.repeat(40)}`)).toEqual([SHAPE])
  })
})

describe('Convex deployment URL', () => {
  it('accepts the hosted URL, and a local backend over http', () => {
    expect(failures(deploymentUrl.rules, 'https://example-animal-123.convex.cloud')).toEqual([])
    expect(failures(deploymentUrl.rules, 'http://127.0.0.1:3210')).toEqual([])
  })

  it('refuses a deploy key where the URL goes', () => {
    expect(failures(deploymentUrl.rules, `prod:example-animal-123|${TOKEN}`)).toEqual([
      'a URL starting with http:// or https://',
    ])
  })
})
