# Bakimono

Bakimono is a Solid single-page app built with Vite.

## Getting started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file to
enable the Supabase client.

To enable Google sign-in, enable Google as an OAuth provider in Supabase
Authentication and add your app's origin and `/dashboard` route to the
Authentication URL allow list. The login and signup pages use
`/dashboard` as the OAuth redirect destination.

## Production

Build the app and serve the generated files locally:

```bash
pnpm build
pnpm start
```

`pnpm preview` can also be used to preview a production build.
