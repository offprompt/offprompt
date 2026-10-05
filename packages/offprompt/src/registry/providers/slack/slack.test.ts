import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { botToken } from './bot-token.js'
import { signingSecret } from './signing-secret.js'
import { webhookUrl } from './webhook-url.js'

const BOT_TOKEN = `xoxb-${'1'.repeat(12)}-${'2'.repeat(13)}-${'a'.repeat(24)}`
const APP_TOKEN = `xapp-1-A${'1'.repeat(10)}-${'2'.repeat(13)}-${'a'.repeat(64)}`
const USER_TOKEN = `xoxp-${'1'.repeat(12)}-${'2'.repeat(12)}-${'3'.repeat(13)}-${'a'.repeat(32)}`
const SIGNING_SECRET = 'a'.repeat(32)
const WEBHOOK = `https://hooks.slack.com/services/T${'0'.repeat(10)}/B${'0'.repeat(10)}/${'X'.repeat(24)}`

describe('Slack bot token', () => {
  it('accepts a bot token, and one that rotates', () => {
    expect(failures(botToken.rules, BOT_TOKEN)).toEqual([])
    expect(failures(botToken.rules, `xoxe.xoxb-1-${'A'.repeat(163)}`)).toEqual([])
  })

  it('refuses the other kinds of Slack token, and the signing secret', () => {
    const line = ['starts with xoxb- or xoxe.xoxb-']
    expect(failures(botToken.rules, APP_TOKEN)).toEqual(line)
    expect(failures(botToken.rules, USER_TOKEN)).toEqual(line)
    expect(failures(botToken.rules, SIGNING_SECRET)).toEqual(line)
  })

  it('refuses another provider key, and a token that is cut short', () => {
    expect(failures(botToken.rules, `sk_live_${'a'.repeat(40)}`)).toEqual(['starts with xoxb- or xoxe.xoxb-'])
    expect(failures(botToken.rules, 'xoxb-1')).toEqual(['at least 20 characters'])
  })
})

describe('Slack signing secret', () => {
  it('accepts 32 hexadecimal characters', () => {
    expect(failures(signingSecret.rules, SIGNING_SECRET)).toEqual([])
    expect(failures(signingSecret.rules, '0123456789abcdef'.repeat(2))).toEqual([])
  })

  it('refuses a bot token and an app-level token, which sit on other pages of the same app', () => {
    expect(failures(signingSecret.rules, BOT_TOKEN)).toEqual(['20 to 48 characters'])
    expect(failures(signingSecret.rules, APP_TOKEN)).toEqual(['20 to 48 characters'])
  })

  it('refuses a value that is cut short', () => {
    expect(failures(signingSecret.rules, 'a'.repeat(12))).toEqual(['20 to 48 characters'])
  })
})

describe('Slack incoming webhook URL', () => {
  it('accepts a webhook URL, and a Workflow Builder one', () => {
    expect(failures(webhookUrl.rules, WEBHOOK)).toEqual([])
    expect(failures(webhookUrl.rules, `https://hooks.slack.com/triggers/T${'0'.repeat(10)}/${'1'.repeat(13)}/${'a'.repeat(32)}`)).toEqual([])
  })

  it('refuses a bot token, and the URL of a Slack page that is not a webhook', () => {
    const line = 'starts with https://hooks.slack.com/'
    expect(failures(webhookUrl.rules, BOT_TOKEN)).toEqual([line])
    expect(failures(webhookUrl.rules, `https://acme.slack.com/services/${'B'.repeat(30)}`)).toEqual([line])
    expect(failures(webhookUrl.rules, WEBHOOK.replace('https://', 'http://'))).toEqual([line])
  })

  it('refuses the bare host, which is no webhook', () => {
    expect(failures(webhookUrl.rules, 'https://hooks.slack.com/')).toEqual(['at least 40 characters'])
  })
})
