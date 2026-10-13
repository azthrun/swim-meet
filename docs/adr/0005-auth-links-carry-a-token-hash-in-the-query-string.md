# Auth links carry a token hash in the query string

Invite and password-reset emails link to the site with `?token_hash=…&type=…` before the `#`, and the app exchanges that for a session itself. The site uses hash routing because GitHub Pages serves one static page, so Supabase's default link, which returns the session in the URL fragment, lands on a route that does not exist. The code-exchange flow was the other option, but it only works in the browser that asked for the link, and an invite is never asked for from the invitee's browser.

## Consequences

The link's shape lives in the Supabase email templates, which only the owner can edit in the dashboard. The templates are kept in `supabase/templates/` so the repository shows what the dashboard should hold; changing one there does nothing until it is pasted in. A template left at the Supabase default sends links the site cannot open.
