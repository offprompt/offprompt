---
'offprompt': patch
---

A value asked for as a URL may use any scheme followed by a host, such as `wss://` for a websocket or `redis://`, where only `http://` and `https://` passed before. A provider's URL that is always a web address, such as a Sentry DSN, still has to start with `http://` or `https://`.
