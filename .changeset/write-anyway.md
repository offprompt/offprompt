---
'offprompt': minor
---

A value its checks refuse can be written anyway. Providers change their key formats, and until offprompt catches up a working key could not be written. Once a value breaks only its own field's checks, a box under it reads "Write it anyway"; ticked, the field counts as ready and its broken checks stay in view. The agent hears which keys were written anyway, under `written_anyway`, so it knows where to look if the service refuses one. offprompt's own checks of the file, its length cap and whether a `.env` can hold the value, still hold.
