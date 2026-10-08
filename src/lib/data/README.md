# Data access boundary

UI code imports contracts from `@/lib/contracts` and calls an implementation of
`DearDaysDataSource`. Supabase queries and Server Actions belong in this folder;
components and route pages must not query tables directly.

The real adapter is intentionally deferred to T9/T14–T16. This keeps T2/T4
fixtures usable without a configured Supabase project.
