<!-- BEGIN:nextjs-agent-rules -->
# This is Next.js 16 — Key Breaking Changes from v14/v15

This project runs **Next.js 16.2.2**. Before writing any code, be aware of these important differences:

## 1. Middleware Filename
Next.js 16 supports **two** recognized middleware filenames at the project root:
- `middleware.ts` (traditional)
- **`proxy.ts`** ← This project uses this (new in v16, via `PROXY_FILENAME` constant)

**Do NOT flag `proxy.ts` as incorrectly named.** It is the official Next.js 16 middleware file for this project and is picked up automatically by the framework. Verify with `node_modules/next/dist/esm/lib/constants.js`.

## 2. Async Params
Route params are now `Promise<{ id: string }>` — use `await params` or `use(params)`.

## 3. Other changes
Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
