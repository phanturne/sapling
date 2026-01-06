# Sapling Design Document

**Version:** 1.0  
**Last Updated:** January 2025  
**Target Launch:** ~1 month from start

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Core Features](#core-features)
5. [AI Integration](#ai-integration)
6. [MVP Implementation Plan](#mvp-implementation-plan)
7. [Technical Stack](#technical-stack)
8. [Security & Rate Limiting](#security--rate-limiting)
9. [Future Enhancements](#future-enhancements)

---

## Overview

### Vision

Sapling is a knowledge management platform that combines AI-powered note-taking with study tools. Users create "spaces" containing sources (files, URLs) and notes, then leverage AI to generate flashcards, quizzes, and concept maps.

### Target Audiences

1. **Personal Knowledge Management**: Users who want an AI-powered note app (Evernote × NotebookLM)
2. **Study Material Creators**: Users who want to create and share study materials (Quizlet-like)

### Core Value Propositions

- **AI-Powered Context**: Chat with an AI assistant that understands all content in your space
- **Study Tools**: Generate flashcards, quizzes, and concept maps from your content
- **Unified Knowledge Base**: Combine external sources (PDFs, URLs) with personal notes
- **Sharing & Discovery**: Share spaces publicly or keep them private

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Spaces UI  │  │  Notes/Src   │  │  AI Chat/    │      │
│  │              │  │  Editor      │  │  Studio      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server Components & Actions            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Server      │  │  Server      │  │  API Routes  │      │
│  │  Components  │  │  Actions     │  │  (AI only)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │   Gemini AI  │  │  Background  │
│   Database   │  │   API        │  │  Workers     │
│              │  │              │  │              │
│  - Spaces    │  │  - Chat      │  │  - Embedding │
│  - Sources   │  │  - Studio    │  │  - Processing│
│  - Notes     │  │  - RAG       │  │  - Summaries │
│  - Embeddings│  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Key Design Decisions

1. **Separate Tables for Notes & Sources**: Different data models, validation, and access patterns
2. **Vector Embeddings**: Store embeddings in Supabase using pgvector extension
3. **RAG for AI Context**: Retrieve relevant chunks via similarity search
4. **Background Processing**: Async jobs for embeddings, summaries, file processing
5. **Web-First**: Responsive web app, mobile-optimized, PWA-ready
6. **Server Components + Server Actions**: Use Next.js 16 patterns for CRUD operations (no API routes needed)
7. **API Routes for Streaming Only**: API routes reserved for AI chat, studio tools, and background jobs that require streaming or external integrations

---

## Data Model

### Database Schema

#### Spaces

```sql
spaces (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### Sources

```sql
sources (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES spaces(id),
  title TEXT NOT NULL,
  content TEXT,
  source_type TEXT CHECK (source_type IN ('text', 'file', 'url')),
  file_path TEXT,
  file_type TEXT,
  file_size BIGINT,
  source_url TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

source_chunks (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES sources(id),
  content TEXT NOT NULL,
  chunk_index INTEGER,
  token_count INTEGER,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ
)

source_summaries (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES sources(id) UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT[],
  topics TEXT[],
  word_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### Notes

```sql
notes (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,  -- Markdown content
  content_hash TEXT,
  embedding_status TEXT DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'ready', 'stale')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
)

note_chunks (
  id UUID PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

note_summaries (
  id UUID PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### Indexes

- `idx_notes_space_id` on `notes(space_id)`
- `idx_notes_embedding_status` on `notes(embedding_status)`
- `idx_note_chunks_note_id` on `note_chunks(note_id)`
- Vector similarity index on `note_chunks(embedding)` and `source_chunks(embedding)`

#### RLS Policies

- Users can view notes in accessible spaces (own or public)
- Owners can manage notes (INSERT, UPDATE, DELETE)
- Chunks and summaries inherit note permissions

### Unified Content View

For UI listing, create a database function or application-level union:

```sql
CREATE OR REPLACE FUNCTION get_space_content(space_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  updated_at TIMESTAMPTZ,
  summary TEXT
) AS $$
  SELECT id, title, 'source'::TEXT, updated_at,
    (SELECT summary FROM source_summaries WHERE source_id = sources.id LIMIT 1)
  FROM sources WHERE space_id = space_id_param
  UNION ALL
  SELECT id, title, 'note'::TEXT, updated_at,
    (SELECT summary FROM note_summaries WHERE note_id = notes.id LIMIT 1)
  FROM notes WHERE space_id = space_id_param
  ORDER BY updated_at DESC;
$$ LANGUAGE SQL;
```

---

## Core Features

### 1. Spaces Management

**MVP Features:**

- Create, edit, delete spaces
- Set visibility (private/public)
- View list of user's spaces
- View space details (title, description, content count)

**UI:**

- Dashboard: Grid/list view of spaces
- Space page: Header with title/description, content list, AI panel

### 2. Notes

**MVP Features:**

- Create, edit, delete notes
- Markdown editor (basic support: headers, lists, links, bold, italic)
- Auto-save (debounced, every 2-3 seconds)
- Title extraction from first line or manual input

**UI:**

- Split-pane or tabbed interface: Content list | Editor
- Markdown preview toggle
- Simple toolbar for formatting

**Technical:**

- Use a markdown editor library (e.g., `react-markdown`, `@uiw/react-md-editor`)
- Store content as-is (markdown text)
- Generate hash on save: `crypto.createHash('sha256').update(content).digest('hex')`

### 3. Sources

**MVP Features:**

- Upload files (PDF, TXT, MD) - max 10MB per file
- Add URL sources (web scraping)
- View source content
- Processing status indicator

**UI:**

- Upload button/drag-drop
- Source list with status badges
- Source viewer (text content display)

**Technical:**

- File upload to Supabase Storage
- Background job processes files:
  - Extract text (PDF parsing, text extraction)
  - Chunk content (500-1000 tokens per chunk)
  - Generate embeddings (Gemini embedding API)
  - Generate summary
- URL sources: Fetch HTML, extract text, process same as files

### 4. AI Chat

**MVP Features:**

- Chat interface within a space
- AI has context of all notes and sources in the space
- RAG-based retrieval for detailed answers
- Message history (last 15 messages)

**Context Strategy (Simplified for MVP):**

1. **System Context** (always included):

   - Space title/description
   - List of all items (titles + summaries) - max 20 items
   - Currently open item (if any) - full content if < 4K tokens, else summary

2. **RAG Retrieval** (on-demand):

   - Function: `search_space_content(query: string, limit: 5)`
   - Uses vector similarity search across `source_chunks` and `note_chunks`
   - Returns top 5 chunks with metadata
   - AI calls this when user asks specific questions

3. **Conversation History**: Last 10 messages

**Implementation:**

- API route: `/api/spaces/[spaceId]/chat`
- Use Gemini API with function calling for RAG
- Stream responses for better UX

### 5. Studio (AI Generation Tools)

**MVP Features:**

- Flashcard generation from selected content
- Quiz generation (multiple choice, short answer)

**Flashcard Generation:**

- User selects: "Generate flashcards from this note/source"
- AI analyzes content, generates Q&A pairs
- Display as flip cards
- Export as JSON/CSV (future: Anki import)

**Quiz Generation:**

- User selects content
- AI generates questions (5-10 questions)
- Multiple choice or short answer
- User can take quiz, get results

**UI:**

- Studio panel in space view
- Generate buttons for each tool
- Results display (flashcards, quiz interface)

---

## AI Integration

### Gemini API Usage

**Endpoints Used:**

1. **Embeddings**: `models/embedding-001` (or latest embedding model)
2. **Chat**: `models/gemini-pro` (or latest chat model)
3. **Function Calling**: For RAG retrieval

### Embedding Generation

**For Sources:**

- Process on upload (background job)
- Chunk size: 500-1000 tokens
- Overlap: 100 tokens between chunks
- Store in `source_chunks.embedding`

**For Notes:**

- Initial: Generate on first save
- Regeneration: On content change (hash differs)
- Background job processes pending embeddings
- Debounce: Wait 2-3 minutes after last edit

**MVP Strategy:**

- Simple hash comparison: if `content_hash` changes, mark `embedding_status = 'pending'`
- Background worker processes all pending items
- No similarity threshold for MVP (regenerate on any change)

### RAG Implementation

**Vector Search Function:**

```sql
CREATE OR REPLACE FUNCTION search_space_content(
  query_embedding VECTOR(1536),
  space_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  content_id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT
    sc.id,
    sc.source_id,
    'source'::TEXT,
    s.title,
    sc.content,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM source_chunks sc
  JOIN sources s ON s.id = sc.source_id
  WHERE s.space_id = space_id_param
    AND sc.embedding IS NOT NULL
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold

  UNION ALL

  SELECT
    nc.id,
    nc.note_id,
    'note'::TEXT,
    n.title,
    nc.content,
    1 - (nc.embedding <=> query_embedding) AS similarity
  FROM note_chunks nc
  JOIN notes n ON n.id = nc.note_id
  WHERE n.space_id = space_id_param
    AND nc.embedding IS NOT NULL
    AND 1 - (nc.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

**AI Chat Flow:**

1. User sends message
2. Generate embedding for user query
3. Call `search_space_content()` to get relevant chunks
4. Build context: summaries + retrieved chunks + conversation history
5. Send to Gemini with function definition for RAG
6. Gemini can call RAG function if needed
7. Stream response to user

### Rate Limiting

**Per User Limits (Free Tier):**

- AI Chat: 50 messages/day
- Embedding generation: 100 items/day
- Studio generation: 20 generations/day (flashcards/quizzes)
- File uploads: 10 files/day, 10MB max per file

**Implementation:**

- Store usage in `user_usage` table (daily reset)
- Check limits in API routes (AI chat, studio tools) before processing
- Check limits in Server Actions (file uploads) before processing
- Return 429 with clear error message

---

## MVP Implementation Plan

### Phase 1: Foundation (Week 1)

**Database:**

- [ ] Create `notes` table migration
- [ ] Create `note_chunks` table migration
- [ ] Create `note_summaries` table migration
- [ ] Create indexes and RLS policies
- [ ] Create `search_space_content()` function
- [ ] Create `get_space_content()` function

**Backend:**

- [ ] Space CRUD Server Actions (`app/spaces/actions.ts`)
- [ ] Note CRUD Server Actions (`app/spaces/[spaceId]/notes/actions.ts`)
- [ ] Source upload Server Actions (`app/spaces/[spaceId]/sources/actions.ts`)
- [ ] User usage tracking table and functions

**Frontend:**

- [ ] Spaces dashboard page
- [ ] Space detail page (layout with content list)
- [ ] Note editor component (markdown)
- [ ] Basic navigation/routing

### Phase 2: Content Management (Week 2)

**Backend:**

- [ ] File upload via Server Actions (Supabase Storage)
- [ ] Background job system (Next.js API route with database queue)
- [ ] PDF/text extraction service
- [ ] Embedding generation service (Gemini API integration)
- [ ] Summary generation service
- [ ] Chunking logic

**Frontend:**

- [ ] Source upload UI (drag-drop, file picker)
- [ ] Source list view with status
- [ ] Source viewer
- [ ] Note list view
- [ ] Content hash generation on note save
- [ ] Embedding status indicators

### Phase 3: AI Chat (Week 3)

**Backend:**

- [ ] Chat API route (`/api/spaces/[spaceId]/chat`)
- [ ] Gemini API client setup
- [ ] Context building logic (summaries + RAG)
- [ ] Streaming response handler
- [ ] RAG function implementation
- [ ] Conversation history storage

**Frontend:**

- [ ] Chat UI component
- [ ] Message display (streaming)
- [ ] Input handling
- [ ] Integration with space page

### Phase 4: Studio Tools (Week 4)

**Backend:**

- [ ] Flashcard generation API (`/api/spaces/[spaceId]/studio/flashcards`)
- [ ] Quiz generation API (`/api/spaces/[spaceId]/studio/quiz`)
- [ ] Content selection handling

**Frontend:**

- [ ] Studio panel UI
- [ ] Flashcard generator interface
- [ ] Flashcard display (flip cards)
- [ ] Quiz generator interface
- [ ] Quiz taking interface
- [ ] Results display

### Phase 5: Polish & Launch Prep (Week 4-5)

**Polish:**

- [ ] Error handling and user feedback
- [ ] Loading states
- [ ] Rate limiting UI (show limits, usage)
- [ ] Responsive design (mobile-friendly)
- [ ] Basic styling/UI improvements

**Testing:**

- [ ] E2E tests for core flows
- [ ] Unit tests for critical functions
- [ ] Manual testing on different devices

**Deployment:**

- [ ] Environment setup (production Supabase, Gemini API keys)
- [ ] Deploy to Vercel/cloud
- [ ] Monitor error rates, API usage

---

## Technical Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Radix UI (already in use)
- **Markdown Editor**: `@uiw/react-md-editor` or `react-markdown`
- **State Management**: React Server Components + Server Actions (minimal client state)

### Backend

- **Database**: Supabase (PostgreSQL + pgvector)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **CRUD Operations**: Next.js Server Components + Server Actions
- **API Routes**: Only for streaming (AI chat), long-running operations (studio tools), and background jobs
- **Background Jobs**:
  - Option 1: Supabase Edge Functions (recommended for scale)
  - Option 2: Next.js API routes with database queue (simpler for MVP)

### AI/ML

- **Provider**: Google Gemini API
- **Models**:
  - Chat: `gemini-pro` or `gemini-1.5-pro`
  - Embeddings: `models/embedding-001` or latest
- **Vector DB**: Supabase pgvector (1536 dimensions for Gemini)

### Infrastructure

- **Hosting**: Vercel (Next.js)
- **Database**: Supabase (managed PostgreSQL)
- **File Storage**: Supabase Storage
- **Monitoring**: Vercel Analytics (basic), Sentry (optional)

---

## Security & Rate Limiting

### Authentication

- Supabase Auth (already implemented)
- RLS policies on all tables
- Server Actions and API routes verify user session
- Server Components check auth before rendering protected content

### Rate Limiting

**Free Tier Limits:**

```typescript
const FREE_TIER_LIMITS = {
  aiChatMessages: 50, // per day
  embeddingGenerations: 100, // per day
  studioGenerations: 20, // per day
  fileUploads: 10, // per day
  maxFileSize: 10 * 1024 * 1024, // 10MB
};
```

**Implementation:**

- `user_usage` table tracks daily usage per user
- Check limits in API routes before processing
- Return `429 Too Many Requests` with reset time
- Show usage in UI (progress bars, remaining counts)

**Storage:**

```sql
CREATE TABLE user_usage (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  ai_chat_messages INT DEFAULT 0,
  embedding_generations INT DEFAULT 0,
  studio_generations INT DEFAULT 0,
  file_uploads INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset daily (via cron or trigger)
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
  UPDATE user_usage SET
    ai_chat_messages = 0,
    embedding_generations = 0,
    studio_generations = 0,
    file_uploads = 0,
    date = CURRENT_DATE
  WHERE date < CURRENT_DATE;
$$ LANGUAGE SQL;
```

**Rate Limiting Efficiency:**

- **MVP Approach**: Use Supabase PostgreSQL (`user_usage` table)

  - **Pros**: Simple, no additional service, sufficient for MVP scale
  - **Cons**: Slower than Redis for high-frequency checks, but acceptable for MVP
  - **Performance**: ~1-5ms per check (acceptable for API routes)
  - **Scale**: Handles hundreds of concurrent users easily

- **Future Migration**: Move to Upstash Redis when needed
  - **When**: If you see >1000 concurrent users or rate limit checks become bottleneck
  - **Benefits**: Sub-millisecond checks, better for high-frequency operations
  - **Cost**: Upstash free tier: 10K commands/day, then pay-as-you-go
  - **Implementation**: Replace DB checks with Redis `INCR` + `EXPIRE` pattern

**Recommendation for MVP**: Start with Supabase DB. It's simpler, sufficient for launch, and you can migrate to Redis later if needed. The performance difference only matters at significant scale.

### Data Privacy

- User data isolated by RLS
- No sharing of content between users (except public spaces)
- File storage: private buckets, path-based access control

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Concept Map Generation**: Visual knowledge graphs
2. **Public Space Discovery**: Browse and search public spaces
3. **Collaboration**: Multiple users per space, roles
4. **Export**: PDF, Anki deck, Markdown
5. **Advanced Markdown**: Code blocks, tables, images
6. **URL Source Enhancement**: Better web scraping, preview cards

### Phase 3 Features

1. **Spaced Repetition**: Built-in SRS for flashcards
2. **Study Analytics**: Progress tracking, study streaks
3. **Templates**: Pre-built note/space templates
4. **Tags & Organization**: Tag system, folders
5. **Search**: Full-text search across spaces
6. **Mobile App**: Native iOS/Android (React Native or PWA)

### Phase 4 Features

1. **AI Tutor Mode**: Socratic questioning
2. **Voice Notes**: Transcribe and add to notes
3. **Browser Extension**: Quick capture
4. **Integrations**: Notion, Obsidian, Anki sync
5. **Study Groups**: Shared study sessions
6. **Premium Features**: Higher limits, advanced AI models

---

## Open Questions & Decisions Needed

1. **Background Job System**: Supabase Edge Functions vs Next.js API routes?

   - **Decision**: Start with Next.js API route + database queue (simpler for MVP)
   - Move to Edge Functions if needed for scale
   - **Architecture**: Use Server Components + Server Actions for CRUD, API routes only for streaming/AI/background jobs

2. **Markdown Editor**: Which library to use?

   - **Recommendation**: `react-markdown` + custom toolbar (lightweight, customizable)

3. **File Processing**: PDF parsing library?

   - **Recommendation**: `pdf-parse` (Node.js) or client-side extraction

4. **URL Scraping**: Server-side or client-side?

   - **Recommendation**: Server-side (Next.js API route) for reliability

5. **Error Handling**: How to handle Gemini API failures?
   - **Recommendation**: Retry logic (3 attempts), fallback messages, user notification

---

## Success Metrics

### MVP Launch Goals

- Users can create spaces and add notes/sources
- AI chat works with RAG retrieval
- Flashcard and quiz generation functional
- Core flows work without major bugs
- Responsive on mobile browsers

### Post-Launch Metrics

- User signups and retention
- Spaces created per user
- AI chat usage (messages per user)
- Studio tool usage (generations per user)
- Error rates and API costs

---

## Appendix

### Key Files Structure

```
app/
  spaces/
    [spaceId]/
      page.tsx              # Space detail page
      notes/
        [noteId]/
          page.tsx          # Note editor page
      chat/
        page.tsx            # AI chat page
      studio/
        page.tsx            # Studio tools page
  api/
    spaces/
      [spaceId]/
        chat/
          route.ts          # AI chat (streaming)
        studio/
          flashcards/
            route.ts        # Flashcard generation (streaming)
          quiz/
            route.ts        # Quiz generation (streaming)
    process/
      route.ts              # Background job handler

lib/
  ai/
    gemini.ts               # Gemini API client
    embeddings.ts           # Embedding generation
    rag.ts                  # RAG retrieval
  content/
    chunking.ts             # Text chunking logic
    extraction.ts           # PDF/text extraction
  utils/
    hashing.ts              # Content hashing

components/
  spaces/
    space-list.tsx
    space-card.tsx
  notes/
    note-editor.tsx
    note-list.tsx
  sources/
    source-upload.tsx
    source-viewer.tsx
  ai/
    chat.tsx
    message.tsx
  studio/
    flashcard-generator.tsx
    quiz-generator.tsx
```

---

**End of Design Document**
