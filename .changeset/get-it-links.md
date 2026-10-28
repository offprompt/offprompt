---
'offprompt': minor
---

"Get it" can open the page for your own project. An agent can give each key a `link`: the project, account or organization it is for, read from the project, and "Get it" opens that one's page instead of one that asks which. To start with that is Supabase's secret and publishable keys (the project ref), Cloudflare's R2 keys (the account ID) and Sentry's auth token (the organization slug). For a key offprompt does not know, such as an internal tool's token, the agent can give the https address where it is made. The page shows it as the agent's suggestion with its whole host, apart from offprompt's own links, and opens it only once you confirm that host. The agent hears which links were used, and why any was dropped.
