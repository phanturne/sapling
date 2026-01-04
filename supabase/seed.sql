-- Seed file for local Supabase development
-- This file inserts 3 test users into auth.users and their corresponding profiles
-- Password for all users: password123

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create a user in auth.users
CREATE OR REPLACE FUNCTION seed_user(
  user_email TEXT,
  user_password TEXT,
  user_meta JSONB
) RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    user_meta,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Create users
DO $$
DECLARE
  alice_id UUID;
  bob_id UUID;
  charlie_id UUID;
BEGIN
  -- User 1: Alice
  alice_id := seed_user(
    'alice@example.com',
    'password123',
    '{"full_name":"Alice Johnson","name":"Alice"}'::jsonb
  );
  
  -- User 2: Bob
  bob_id := seed_user(
    'bob@example.com',
    'password123',
    '{"full_name":"Bob Smith","name":"Bob"}'::jsonb
  );
  
  -- User 3: Charlie
  charlie_id := seed_user(
    'charlie@example.com',
    'password123',
    '{"full_name":"Charlie Brown","name":"Charlie"}'::jsonb
  );
END $$;

-- Update profiles with proper usernames and display names
-- The trigger should have created profiles, but we'll update them to ensure proper data
UPDATE profiles
SET 
  username = 'alice',
  display_name = 'Alice Johnson',
  email = 'alice@example.com'
WHERE email = 'alice@example.com';

UPDATE profiles
SET 
  username = 'bob',
  display_name = 'Bob Smith',
  email = 'bob@example.com'
WHERE email = 'bob@example.com';

UPDATE profiles
SET 
  username = 'charlie',
  display_name = 'Charlie Brown',
  email = 'charlie@example.com'
WHERE email = 'charlie@example.com';

-- Insert sample spaces and content for Alice (first user)
DO $$
DECLARE
  alice_id UUID;
  cs_space_id UUID;
  web_space_id UUID;
  public_space_id UUID;
BEGIN
  -- Get Alice's user ID
  SELECT id INTO alice_id FROM auth.users WHERE email = 'alice@example.com' LIMIT 1;
  
  IF alice_id IS NULL THEN
    RAISE NOTICE 'Alice user not found. Skipping seed data.';
    RETURN;
  END IF;

  -- Insert sample spaces for Alice
  INSERT INTO spaces (user_id, title, description, visibility, created_at, updated_at)
  VALUES
    (
      alice_id,
      'Computer Science Fundamentals',
      'A space for learning the basics of computer science, algorithms, and data structures.',
      'private',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '1 day'
    ),
    (
      alice_id,
      'Web Development Notes',
      'Notes and resources for modern web development with React, Next.js, and TypeScript.',
      'private',
      NOW() - INTERVAL '5 days',
      NOW()
    ),
    (
      alice_id,
      'Public Study Materials',
      'Shared study materials for the Introduction to Databases course.',
      'public',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '2 hours'
    )
  ON CONFLICT DO NOTHING;

  -- Get the space IDs
  SELECT id INTO cs_space_id FROM spaces WHERE title = 'Computer Science Fundamentals' AND user_id = alice_id LIMIT 1;
  SELECT id INTO web_space_id FROM spaces WHERE title = 'Web Development Notes' AND user_id = alice_id LIMIT 1;
  SELECT id INTO public_space_id FROM spaces WHERE title = 'Public Study Materials' AND user_id = alice_id LIMIT 1;

  -- Insert sample notes for Computer Science space
  IF cs_space_id IS NOT NULL THEN
    INSERT INTO notes (space_id, title, content, content_hash, embedding_status, created_by, created_at, updated_at)
    VALUES
      (
        cs_space_id,
        'Data Structures Overview',
        '# Data Structures Overview

## Arrays
Arrays are contiguous blocks of memory that store elements of the same type.
- Access time: O(1)
- Insertion time: O(n)

## Linked Lists
A sequence of nodes where each node points to the next.
- Access time: O(n)
- Insertion time: O(1) at head

## Hash Tables
Key-value pairs with average O(1) access time.

## Trees
Hierarchical data structures with nodes and edges.',
        encode(digest('Data Structures Overview' || NOW()::text, 'sha256'), 'hex'),
        'pending',
        alice_id,
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '2 days'
      ),
      (
        cs_space_id,
        'Algorithm Complexity',
        '# Algorithm Complexity

## Big O Notation
Big O describes the worst-case time or space complexity of an algorithm.

### Common Complexities
- O(1): Constant time
- O(log n): Logarithmic time
- O(n): Linear time
- O(n log n): Linearithmic time
- O(n²): Quadratic time
- O(2ⁿ): Exponential time',
        encode(digest('Algorithm Complexity' || NOW()::text, 'sha256'), 'hex'),
        'pending',
        alice_id,
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '1 day'
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert sample notes for Web Development space
  IF web_space_id IS NOT NULL THEN
    INSERT INTO notes (space_id, title, content, content_hash, embedding_status, created_by, created_at, updated_at)
    VALUES
      (
        web_space_id,
        'React Hooks Cheat Sheet',
        '# React Hooks Cheat Sheet

## useState
Manages component state.

```javascript
const [count, setCount] = useState(0);
```

## useEffect
Handles side effects and lifecycle events.

```javascript
useEffect(() => {
  // Effect code
}, [dependencies]);
```

## useContext
Accesses context values.

```javascript
const value = useContext(MyContext);
```',
        encode(digest('React Hooks Cheat Sheet' || NOW()::text, 'sha256'), 'hex'),
        'pending',
        alice_id,
        NOW() - INTERVAL '3 days',
        NOW()
      ),
      (
        web_space_id,
        'Next.js App Router',
        '# Next.js App Router

## File-based Routing
The App Router uses the file system to define routes.

- `app/page.tsx` → `/`
- `app/about/page.tsx` → `/about`
- `app/blog/[id]/page.tsx` → `/blog/:id`

## Server Components
By default, components in the App Router are Server Components.

## Client Components
Use `"use client"` directive for client-side interactivity.',
        encode(digest('Next.js App Router' || NOW()::text, 'sha256'), 'hex'),
        'pending',
        alice_id,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 hour'
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert sample notes for Public space
  IF public_space_id IS NOT NULL THEN
    INSERT INTO notes (space_id, title, content, content_hash, embedding_status, created_by, created_at, updated_at)
    VALUES
      (
        public_space_id,
        'Database Design Principles',
        '# Database Design Principles

## Normalization
Organize data to minimize redundancy.

## ACID Properties
- **Atomicity**: All or nothing
- **Consistency**: Valid state transitions
- **Isolation**: Concurrent transactions
- **Durability**: Committed changes persist

## Indexes
Improve query performance on frequently accessed columns.',
        encode(digest('Database Design Principles' || NOW()::text, 'sha256'), 'hex'),
        'pending',
        alice_id,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '30 minutes'
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert sample sources (text sources)
  IF cs_space_id IS NOT NULL THEN
    INSERT INTO sources (space_id, title, content, source_type, status, created_at, updated_at)
    VALUES
      (
        cs_space_id,
        'Introduction to Algorithms',
        'This is a sample text source about algorithms. In computer science, an algorithm is a finite sequence of rigorous instructions, typically used to solve a class of specific problems or to perform a computation.',
        'text',
        'ready',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
      )
    ON CONFLICT DO NOTHING;
  END IF;

  IF web_space_id IS NOT NULL THEN
    INSERT INTO sources (space_id, title, source_type, source_url, status, created_at, updated_at)
    VALUES
      (
        web_space_id,
        'React Documentation',
        'url',
        'https://react.dev',
        'processing',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
      )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Seed data created successfully for user: alice@example.com';
END $$;
