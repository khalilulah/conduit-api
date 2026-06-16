# Conduit API — Project Documentation

## What Is This Project?

Conduit is a fully functional REST API for a Medium.com clone called RealWorld. It was built from scratch in Node.js and PostgreSQL as a deep learning project — no ORMs, no shortcuts. Every SQL query is hand-written to build genuine understanding of how databases work.

Reference spec: https://realworld-docs.netlify.app/specifications/backend/endpoints/

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Node.js + Express | HTTP server and routing |
| PostgreSQL (via `pg`) | Database — raw SQL, no ORM |
| `jsonwebtoken` | JWT generation and verification |
| `bcrypt` | Password hashing |
| `slugify` + `crypto` | URL-friendly slug generation |
| `dotenv` | Environment variable loading |
| `nodemon` | Auto-restart in development |

---

## Project Structure

```
conduit-api/
├── src/
│   ├── app.js                        ← Express app setup, mounts all routers
│   ├── server.js                     ← Entry point, starts HTTP server
│   ├── db/
│   │   ├── index.js                  ← pg Pool connection, exports query() and pool
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_follows.sql
│   │       ├── 003_create_articles.sql
│   │       ├── 004_create_tags.sql
│   │       ├── 005_create_article_tags.sql
│   │       ├── 006_create_comments.sql
│   │       └── 007_create_favorites.sql
│   ├── middleware/
│   │   ├── auth.js                   ← authRequired + authOptional middleware
│   │   └── errors.js                 ← Global error handler
│   └── features/
│       ├── users/
│       │   ├── users.routes.js
│       │   ├── users.controller.js
│       │   └── users.queries.js
│       ├── articles/
│       │   ├── articles.routes.js
│       │   ├── articles.controller.js
│       │   ├── articles.queries.js
│       │   ├── comments.controller.js
│       │   └── comments.queries.js
│       └── tags/
│           ├── tags.routes.js
│           ├── tags.controller.js
│           └── tags.queries.js
├── .env
├── .env.example
└── package.json
```

### Why This Structure?

Each feature folder contains exactly three files: routes, controller, queries. This enforces separation of concerns:

- **routes.js** — only maps HTTP method + URL to a controller function
- **controller.js** — only handles HTTP: reads request, calls queries, sends response
- **queries.js** — only knows SQL: no HTTP objects, no business logic

This means if your SQL changes, you only touch queries.js. If your response format changes, you only touch controller.js.

---

## Database Schema

### All 7 Tables

```
users
  id SERIAL PRIMARY KEY
  email TEXT UNIQUE NOT NULL
  username TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  bio TEXT
  image TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()

articles
  id SERIAL PRIMARY KEY
  slug TEXT UNIQUE NOT NULL
  title TEXT NOT NULL
  description TEXT NOT NULL
  body TEXT NOT NULL
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()

tags
  id SERIAL PRIMARY KEY
  name TEXT UNIQUE NOT NULL

article_tags  (join table)
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE
  PRIMARY KEY (article_id, tag_id)

comments
  id SERIAL PRIMARY KEY
  body TEXT NOT NULL
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()

follows  (join table — self-referential)
  follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  followee_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  PRIMARY KEY (follower_id, followee_id)

favorites  (join table)
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE
  PRIMARY KEY (user_id, article_id)
```

### Key Schema Decisions

- **TEXT not VARCHAR** — no performance difference in PostgreSQL; TEXT is simpler
- **TIMESTAMPTZ not TIMESTAMP** — stores timezone-aware timestamps, always in UTC
- **ON DELETE CASCADE** — deleting a user automatically deletes their articles, comments, follows, favorites
- **Composite primary keys on join tables** — prevents duplicate relationships at the database level
- **Slugs are unique** — generated from title + random 6-character hex suffix to prevent collisions
- **Raw integer IDs never exposed in API responses** — only slugs and usernames are used as public identifiers

---

## API Endpoints (20 total)

### Authentication

All protected endpoints require the header:
```
Authorization: Token <jwt>
```

### Users & Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/users | No | Register a new user |
| POST | /api/users/login | No | Login, returns JWT |
| GET | /api/user | Required | Get current user |
| PUT | /api/user | Required | Update current user |
| GET | /api/profiles/:username | Optional | Get a user profile |

### Following

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/profiles/:username/follow | Required | Follow a user |
| DELETE | /api/profiles/:username/follow | Required | Unfollow a user |

### Articles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/articles | Optional | List articles with filters |
| GET | /api/articles/feed | Required | Articles from followed users |
| GET | /api/articles/:slug | Optional | Get single article |
| POST | /api/articles | Required | Create article |
| PUT | /api/articles/:slug | Required | Update article (author only) |
| DELETE | /api/articles/:slug | Required | Delete article (author only) |

#### GET /api/articles Query Parameters

| Param | Description | Example |
|-------|-------------|---------|
| tag | Filter by tag | ?tag=javascript |
| author | Filter by author username | ?author=khalil |
| favorited | Filter by who favorited | ?favorited=khalil |
| limit | Number of results (default 20) | ?limit=10 |
| offset | Skip N results (default 0) | ?offset=20 |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/articles/:slug/comments | Required | Add comment |
| GET | /api/articles/:slug/comments | Optional | Get comments |
| DELETE | /api/articles/:slug/comments/:id | Required | Delete comment (author only) |

### Favorites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/articles/:slug/favorite | Required | Favorite article |
| DELETE | /api/articles/:slug/favorite | Required | Unfavorite article |

### Tags

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/tags | No | Get all tags |

---

## Response Formats

### User object
```json
{
  "user": {
    "email": "khalil@test.com",
    "username": "khalil",
    "bio": null,
    "image": null,
    "token": "<jwt>"
  }
}
```

### Profile object
```json
{
  "profile": {
    "username": "khalil",
    "bio": null,
    "image": null,
    "following": false
  }
}
```

### Article object
```json
{
  "article": {
    "slug": "how-to-learn-node-js-x7k2p9",
    "title": "How to Learn Node.js",
    "description": "A beginner guide",
    "body": "You have to practice...",
    "tagList": ["node", "javascript"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "khalil",
      "bio": null,
      "image": null,
      "following": false
    }
  }
}
```

### Error object
```json
{
  "errors": {
    "body": ["error message here"]
  }
}
```

---

## Key Technical Decisions

### JWT Authentication
Tokens are signed with HMAC-SHA256 using a server secret. Verification re-runs the hash — no database lookup needed. Tokens expire after 7 days. There is no token invalidation (stateless by design).

### Slug Generation
Every article gets a URL-friendly slug generated from the title plus a random 6-character hex suffix (`crypto.randomBytes(3).toString('hex')`). The suffix prevents collisions without needing a pre-check query.

### Article Query Strategy
A single SQL query fetches all article data using JOINs and aggregates: `array_agg` for tags, `COUNT(DISTINCT)` for favorites count, and `EXISTS` subqueries for boolean fields (`favorited`, `following`). This avoids N+1 queries.

### Transactions for Article Creation
Creating an article with tags requires multiple inserts (article → tags → article_tags). These run inside a PostgreSQL transaction using a dedicated pool client to ensure atomicity — either all inserts succeed or none do.

### Dynamic Query Building for Filtering
`GET /api/articles` supports optional filters. The SQL WHERE clause is built programmatically using a `conditions` array and `paramIndex` counter, ensuring only the requested filters are applied and all values are properly parameterized.

### Authorization Checks
Before updating or deleting an article or comment, the API fetches the resource's `author_id` and compares it to `req.user.id`. Mismatches return 403 Forbidden.

---

## Environment Variables

```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/conduit_dev
JWT_SECRET=your-long-random-secret-here
PORT=3000
```

---

## Running the Project

```bash
# Install dependencies
npm install

# Run migrations (run each file in order in psql)
psql -U postgres -d conduit_dev -f src/db/migrations/001_create_users.sql
# ... repeat for 002 through 007

# Start development server
npm run dev

# Health check
curl http://localhost:3000/api/health
```
