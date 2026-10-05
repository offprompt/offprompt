import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

const MESSAGE = 'a pcsk_ or pckey_ key, or an older UUID key'

describe('Pinecone API key', () => {
  it('accepts a pcsk_ key, a pckey_ key and an older UUID key', () => {
    expect(failures(apiKey.rules, `pcsk_${'a'.repeat(6)}_${'b'.repeat(63)}`)).toEqual([])
    expect(failures(apiKey.rules, `pckey_${'a'.repeat(6)}_${'b'.repeat(63)}`)).toEqual([])
    expect(failures(apiKey.rules, '123e4567-e89b-12d3-a456-426614174000')).toEqual([])
  })

  it('refuses an OpenAI key and a Hugging Face token pasted by mistake, and one cut short', () => {
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual([MESSAGE])
    expect(failures(apiKey.rules, `hf_${'a'.repeat(34)}`)).toEqual([MESSAGE])
    expect(failures(apiKey.rules, 'pcsk_short')).toEqual([MESSAGE])
  })
})
