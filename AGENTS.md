# AGENTS.md - Assistant Guidelines for Sapling

This document provides guidance for AI assistants working on the Sapling codebase. Refer to `DESIGN.md` for feature specifications and architecture details.

## Project Overview

**Sapling** is a knowledge management platform combining AI-powered note-taking with study tools. Built with Next.js 16, React 19, and Supabase.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.1
- **Database/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS 4
- **UI Components**: ShadCN
- **TypeScript**: Strict mode enabled
- **Testing**: Vitest (unit) + Playwright (E2E)
- **AI SDK**: Vercel AI SDK (for streaming AI responses)

## Agent Behavior & Style

- **Be Concise**: Do not explain basic React/Next.js concepts unless asked
- **Code Quality**: Favor composition over large components
- **Modernity**: Use TypeScript `type` over `interface` for data structures
- **Dry Run**: Before writing complex migrations, describe the plan in 2-3 bullet points
- **No placeholders**: Write complete code; do not leave `// ... logic here` comments

## Architecture Patterns

### Next.js App Router

- **Server Components by default**: All components are Server Components unless marked with `"use client"`
- **Server Actions**: Use `"use server"` directive for form handlers and mutations
- **File-based routing**: Routes are defined by the file system in `app/`
- **API Routes**: Only use `route.ts` files for streaming responses (AI chat), long-running operations (studio tools), or external integrations (webhooks, OAuth)
- **CRUD Operations**: Use Server Components + Server Actions, NOT API routes

### Architecture Decision: Server Components + Server Actions vs API Routes

**Use Server Components + Server Actions for:**

- All CRUD operations (spaces, notes, sources)
- File uploads
- Form submissions
- Data fetching for initial page loads

**Use API Routes for:**

- Streaming responses (AI chat with Vercel AI SDK)
- Long-running operations that need progress updates (studio tools)
- Background job processing
- External integrations (webhooks, OAuth callbacks)

**Why this pattern?**

- Server Components + Server Actions are the modern Next.js 16 pattern
- No redundant auth logic (single source of truth)
- Better type safety and developer experience
- Simpler codebase (no duplicate CRUD logic)
- API routes are only needed when Server Actions can't handle the use case (streaming, external integrations)

### Supabase SSR Pattern

The project uses the Supabase SSR pattern with three client utilities:

1. **Server-side** (`utils/supabase/server.ts`): Use in Server Components and Server Actions

   ```typescript
   const supabase = await createClient();
   const {
     data: { user },
   } = await supabase.auth.getUser();
   ```

2. **Client-side** (`utils/supabase/client.ts`): Use in Client Components

   ```typescript
   const supabase = createClient();
   ```

3. **Middleware** (`utils/supabase/middleware.ts`): Handles session refresh and auth redirects
   - Next.js 16 uses `proxy.ts` (not `middleware.ts`) for middleware functionality
   - Configured in `proxy.ts` at the root level, which exports a `proxy` function
   - Redirects authenticated users away from `/auth/*` pages

**Important**: Always use the appropriate client for the context (server vs client).

### Type Safety

- Database types are auto-generated in `supabase/types.ts`
- Always use typed Supabase client: `createClient<Database>()`
- Types are already configured in the client utilities

## Code Conventions

### Server Actions

- Place Server Actions in `actions.ts` files alongside pages
- Always mark with `"use server"` directive
- **Always use Zod schemas to validate FormData** before hitting Supabase
- Pattern for authentication and validation:

  ```typescript
  "use server";

  import { createClient } from "@/utils/supabase/server";
  import { redirect } from "next/navigation";
  import { revalidatePath } from "next/cache";
  import { z } from "zod";

  const myActionSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
  });

  export async function myAction(formData: FormData) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/login");
    }

    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
    };

    const validation = myActionSchema.safeParse(rawData);
    if (!validation.success) {
      redirect("/page?error=validation_failed");
    }

    const { title, description } = validation.data;

    const { error } = await supabase
      .from("table")
      .insert({ title, description });

    if (error) {
      redirect("/page?error=insert_failed");
    }

    revalidatePath("/path-to-revalidate");
    redirect("/success-page");
  }
  ```

### Error Handling Pattern

The project uses different error handling patterns depending on the context:

#### Server Actions (Form Submissions)

Use redirect-based error handling with query parameters:

```typescript
// In Server Action
if (error) {
  redirect("/page?error=error_code");
}

// In Page Component
const params = await searchParams;
const error = typeof params.error === "string" ? params.error : null;

const humanError =
  error === "error_code" ? "Human-readable error message" : null;
```

#### API Routes (JSON Responses)

For API routes that return JSON, use HTTP status codes and JSON error responses:

```typescript
// In API Route (route.ts)
if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

if (validationError) {
  return Response.json(
    { error: "Validation failed", details: validationErrors },
    { status: 400 }
  );
}

// Success response
return Response.json({ data: result }, { status: 200 });
```

#### Error Boundaries

- Use `error.tsx` files for error boundaries in the app directory
- Handle unexpected errors gracefully with user-friendly messages

### Form Handling

- Use Server Actions with native HTML forms (no client-side state for simple forms)
- FormData extraction pattern:
  ```typescript
  const field = (formData.get("field_name") as string | null)?.trim();
  ```
- Validation: Use HTML5 validation (`required` attribute) + server-side validation
- Always trim string inputs

### Database Patterns

#### Row Level Security (RLS)

- All tables have RLS enabled
- Policies are defined in migrations
- Always verify user has access before operations (RLS handles most, but be explicit in code comments)

#### Migrations

- Migrations are in `supabase/migrations/`
- Use descriptive names with timestamps: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Always include:
  - Table definitions with constraints
  - Indexes for performance
  - RLS policies
  - Triggers for `updated_at` (use `update_updated_at_column()` function)
  - Comments for complex logic

#### Type Generation

- Run `supabase gen types typescript --local > supabase/types.ts` after schema changes
- Types are automatically used by the Supabase clients

### Component Patterns

#### Server Components (Default)

- Fetch data directly in the component
- Use async/await
- Pass data to child components as props

#### Client Components

- Mark with `"use client"` directive
- Use for interactivity (onClick, useState, useEffect, etc.)
- Keep client components small and focused

#### Client State Management

- **Prefer Server Components + Server Actions**: Minimize client state when possible
- **Local state**: Use `useState` and `useReducer` for component-local state
- **Global client state**: Use React Context only when truly needed (e.g., theme, modal state)
- **Pattern**: Prefer Server Components fetching data, pass to Client Components as props

#### UI Components

- Located in `components/ui/`
- Use Radix UI primitives
- Style with Tailwind CSS
- Use `cn()` utility for conditional classes
- Follow existing patterns (see `components/ui/button.tsx`)

### Styling

- Tailwind CSS 4 with custom theme
- Use design tokens from `globals.css` (e.g., `bg-background`, `text-foreground`)
- Prefer semantic color tokens over direct colors
- Dark mode support via `.dark` class
- Use `cn()` from `lib/utils.ts` for conditional classes

### Component Location

- **Feature components**: Place in `components/[feature]/` directory (e.g., `components/notes/`, `components/spaces/`)
  - Use this pattern for reusable feature components
  - Co-locate test files: `components/[feature]/component.test.tsx`
- **Page-specific components**: Only use `app/[feature]/components/` if components are truly page-specific and never reused elsewhere
- **Shared UI components**: Place in `components/ui/` (ShadCN components)

### File Structure

```
app/
  [feature]/
    page.tsx          # Page component (Server Component)
    actions.ts        # Server Actions (if needed)
    [id]/
      page.tsx        # Dynamic route
components/
  [feature]/
    component.tsx     # Feature component
    component.test.tsx # Tests co-located
  ui/
    component.tsx     # Shared UI components
lib/
  utility.ts          # Utility functions
utils/
  supabase/
    server.ts         # Server Supabase client
    client.ts         # Client Supabase client
    middleware.ts     # Middleware session handler
supabase/
  migrations/         # Database migrations
  types.ts            # Generated database types
tests/
  setup.ts            # Test configuration
  __mocks__/          # Test mocks
```

## Testing Patterns

### Unit Tests (Vitest)

- Co-locate test files: `*.test.ts` or `*.test.tsx`
- Use `tests/__mocks__/supabase.ts` for mocking Supabase client
- Mock Next.js navigation: `redirect` throws error (see `tests/setup.ts`)
- Mock `next/cache`: `revalidatePath` is mocked
- Test patterns in `app/profile/actions.test.ts`

### E2E Tests (Playwright)

- Tests in `e2e/` directory
- Use helpers from `e2e/helpers/` when available
- Test actual user flows (form submissions, navigation)
- Use real authentication helpers when testing authenticated flows

### Test Setup

- Global setup in `tests/setup.ts`
- Mocks for `next/navigation` and browser APIs
- Vitest configured with jsdom environment

### Testing Expectations

- **Unit tests**: Write tests for validation logic in Server Actions (see `app/profile/actions.test.ts`)
- **Unit tests**: Write tests for utility functions and complex logic
- **E2E tests**: Write tests for critical user flows
- **Not everything needs tests**: Focus on validation, critical paths, and complex logic
- Co-locate test files with source files (`*.test.ts` or `*.test.tsx`)

## AI Integration Patterns

### Vercel AI SDK

The project uses Vercel AI SDK for AI-powered features (chat, studio tools).

### When to Use API Routes vs Server Actions

**Use API Routes for:**

- Streaming responses (AI chat, studio tools with streaming)
- Long-running operations that need progress updates
- External integrations (webhooks, OAuth callbacks)
- Background job processing

**Use Server Actions for:**

- Internal CRUD operations (spaces, notes, sources)
- File uploads
- Non-streaming AI operations (if any)
- Form submissions

#### Streaming Responses (API Routes)

For streaming AI responses (e.g., chat), use API routes with Vercel AI SDK:

```typescript
// app/api/spaces/[spaceId]/chat/route.ts
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: google("gemini-pro"),
    messages,
    // ... other config
  });

  return result.toAIStreamResponse();
}
```

#### Best Practices

- **Store API keys in environment variables**: Never hardcode API keys
- **Use streaming for chat**: Prefer `streamText()` for better UX
- **Error handling**: Handle API errors gracefully with retry logic when appropriate
- **Rate limiting**: Check user usage limits before processing (see DESIGN.md for limits)
- **Server Actions for non-streaming**: Use Server Actions for AI operations that don't need streaming

## Background Jobs

For MVP, use a simple database-backed queue pattern:

- **Pattern**: Next.js API route that processes jobs from a database table
- **Queue table**: Create a `processing_queue` table with status fields
- **Status values**: `pending`, `processing`, `completed`, `failed`
- **Processing**: API route checks for pending jobs and processes them
- **Future migration**: Can migrate to Supabase Edge Functions or dedicated job queue service if needed for scale

Example pattern:

```typescript
// Database: processing_queue table
// - id, job_type, payload (JSONB), status, created_at, updated_at

// API route: app/api/process/route.ts
export async function POST(request: Request) {
  // Authenticate, check for pending jobs, process, update status
}
```

## Authentication Patterns

### Server-Side Auth Check

Always check authentication in Server Actions and protected pages:

```typescript
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  redirect("/auth/login");
}
```

### Protected Routes

- Middleware handles redirecting authenticated users away from `/auth/*`
- For protected pages, check auth in the page component
- Use RLS policies for database-level access control

## Database Schema Patterns

### Tables

- Use UUID primary keys: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- Include `created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`
- Include `updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`
- Use triggers for `updated_at`: `update_updated_at_column()`

### Foreign Keys

- Use `ON DELETE CASCADE` for child records (notes, sources, chunks)
- Use `ON DELETE SET NULL` for optional references (e.g., `created_by`)
- Always include foreign key constraints

### Constraints

- Use `CHECK` constraints for enums (e.g., `visibility IN ('private', 'public')`)
- Use `NOT NULL` explicitly for required fields
- Add data integrity constraints when fields depend on other fields

## Common Patterns

### Revalidation

After mutations, revalidate relevant paths:

```typescript
revalidatePath("/path"); // Revalidate specific path
revalidatePath("/", "layout"); // Revalidate layout
```

### Redirects

Use `redirect()` from `next/navigation` in Server Actions (it throws, so no code after it executes).

### Search Params

In Server Components, search params are async:

```typescript
type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const value = params.key;
}
```

### File Upload Pattern

- **Use Server Actions** for file uploads (preferred pattern)
- Works well with Supabase Storage and form-based uploads
- See `app/profile/actions.ts` (`uploadAvatar`) for reference pattern
- Use API routes only if you need streaming uploads or special handling

Example pattern:

```typescript
"use server";

export async function uploadFile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    redirect("/page?error=no_file");
  }

  const path = `${user.id}/${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from("bucket-name")
    .upload(path, file);

  // Handle error, revalidate, redirect
}
```

### Image Handling

- Use Next.js `Image` component for optimized images
- Store user-uploaded images in Supabase Storage
- Use public URLs from `supabase.storage.from('bucket').getPublicUrl(path)`

## File Ownership & Boundaries

- `supabase/types.ts` is **generated** — do not edit manually
- `components/ui/*` should only change to match ShadCN updates
- Auth logic lives in Server Actions or middleware only
- Business logic should not live in UI components

## Common Pitfalls to Avoid

1. **Don't mix server and client patterns**: Don't use `"use client"` unnecessarily
2. **Don't create API routes for internal CRUD**: Use Server Components + Server Actions instead
3. **Don't forget RLS**: Always consider RLS policies when querying
4. **Don't skip type generation**: Regenerate types after schema changes
5. **Don't forget revalidation**: Always revalidate after mutations
6. **Don't use client-side redirects in Server Actions**: Use `redirect()` from `next/navigation`
7. **Don't forget error handling**: Always handle errors and provide user feedback
8. **Don't use `any` types**: Use proper TypeScript types
9. **Don't forget authentication checks**: Always verify user in protected actions/pages

## Development Workflow

1. **Database changes**: Create migration → apply locally → generate types
2. **New features**:
   - **CRUD operations**: Use Server Components (fetch data) + Server Actions (mutations)
   - **Streaming/AI**: Create API routes for streaming responses (AI chat, studio tools)
   - **Background jobs**: Create API routes for job processing
   - Create pages → Add components → Write tests
3. **UI components**: Add to `components/ui/` following ShadCN patterns
4. **Testing**: Write unit tests for validation logic, E2E tests for user flows
5. **AI features**: Use Vercel AI SDK in API routes for streaming, Server Actions for non-streaming

## References

- **Design Document**: `DESIGN.md` - Feature specs, architecture, data model
- **Next.js 16 Docs**: https://nextjs.org/docs
- **Supabase SSR Guide**: https://supabase.com/docs/guides/auth/server-side/nextjs
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **ShadCN UI**: https://ui.shadcn.com/

---

**Last Updated**: January 2025
