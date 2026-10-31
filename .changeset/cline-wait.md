---
'offprompt': patch
---

In Cline, which stops a tool call after 60 seconds, `collect_secret` answers `awaiting` after 50 seconds with the page still open, and `await_secret` long-polls for 50, so a person who takes longer than a minute no longer loses the request. Cline's entry needs no `timeout`.
