import { createHandler } from './handler.ts'
Deno.serve(createHandler(() => Deno.env.get('SEARCHAPI_API_KEY')))
