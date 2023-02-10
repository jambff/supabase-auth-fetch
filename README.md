# Supabase Auth Fetch

A fetch client that integrates with [Supabase Auth](https://supabase.com/auth).

## Installation

```text
yarn add @jambff/supabase-auth-fetch
```

## Usage

```tsx
import { createClient } from '@supabase/supabase-js';
import { createAuthenticatedFetch } from '@jambff/supabase-auth-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const fetch = createAuthenticatedFetch(supabase);

fetch('http://example.com/secure');
```

Using this client an `Authorization` header will be added to any requests
containing the access token for the currently authenticated user, for example:

```text
Authorization: Bearer [ACCESS TOKEN]
```

If a request fails with a 401 or 403 status code and attempt will be made to
refresh the current Supabase session before trying again.
