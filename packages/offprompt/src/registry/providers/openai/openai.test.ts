import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

const REFUSED = 'a project, service account or user key, or a legacy sk- key'

describe('OpenAI API key', () => {
  it('accepts a project, service account or user key, and a legacy one', () => {
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(156)}`)).toEqual([])
    expect(failures(apiKey.rules, `sk-svcacct-${'a'.repeat(150)}`)).toEqual([])
    expect(failures(apiKey.rules, `sk-None-${'a'.repeat(150)}`)).toEqual([])
    expect(failures(apiKey.rules, `sk-${'a'.repeat(20)}T3BlbkFJ${'a'.repeat(20)}`)).toEqual([])
  })

  it("refuses the keys of providers whose keys also start with sk-", () => {
    expect(failures(apiKey.rules, `sk-or-v1-${'0'.repeat(64)}`)).toEqual([REFUSED])
    expect(failures(apiKey.rules, `sk-ant-api03-${'a'.repeat(93)}AA`)).toEqual([REFUSED])
    expect(failures(apiKey.rules, `sk-${'0'.repeat(32)}`)).toEqual([REFUSED])
    expect(failures(apiKey.rules, `re_${'a'.repeat(50)}`)).toEqual([REFUSED])
  })
})
