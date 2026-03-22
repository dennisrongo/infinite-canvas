<p align="center">
  <img src="./docs/screenshots/image.png" alt="Infinite Canvas" width="700">
</p>

<h1 align="center">Infinite Canvas</h1>

<p align="center">
  A visual workspace for your best ideas. Connect notes, build mind maps, and organize research on an infinite canvas.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/Next.js-15.1.3-black" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <a href="https://infinite-canvas-web.netlify.app/"><strong>Live Demo</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://dennisrongo.github.io/infinite-canvas/"><strong>Project Page</strong></a> &nbsp;&middot;&nbsp;
  <a href="#getting-started"><strong>Getting Started</strong></a>
</p>

---

## Screenshots

| Landing Page | Login |
|:---:|:---:|
| ![Landing Page](./docs/screenshots/image.png) | ![Login Page](./docs/screenshots/image1.png) |

## Features

- **Infinite Canvas** - Pan and zoom through an unlimited workspace
- **Rich Markdown Editing** - Full Markdown with syntax-highlighted code blocks
- **Visual Connections** - Draw directed edges between notes to map relationships
- **Folder Organization** - Group canvases into hierarchical folders
- **Global Search** - Instantly find notes and canvases across your workspace
- **Light & Dark Themes** - Persistent theme preference per user
- **Import / Export** - Share canvases as JSON files
- **Responsive** - Works on mobile, tablet, and desktop
- **Auto-save & Undo/Redo** - Never lose your work
- **Deep Linking** - Link directly to specific notes via URL

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, @xyflow/react |
| **Backend** | Next.js API Routes, Prisma, PostgreSQL (NeonDB) |
| **Auth** | JWT, bcrypt, CSRF tokens |
| **Validation** | Zod, DOMPurify, Highlight.js |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database ([NeonDB](https://neon.tech) recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/dennisrongo/infinite-canvas.git
cd infinite-canvas

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `NEXTAUTH_URL` | Base URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Secret for NextAuth |

## Project Structure

```
app/
  api/              # REST API routes (auth, canvases, notes, folders, search)
  auth/             # Login, register, password reset pages
  canvas/           # Canvas editor view
  dashboard/        # Main dashboard
  settings/         # User settings
src/
  components/
    canvas/         # NoteNode, ReactFlowCanvas, connections
    layout/         # Header, sidebar
    ui/             # Button, Modal, Toast, etc.
  contexts/         # Theme, Toast, Sidebar providers
  hooks/            # Custom React hooks
  lib/              # Utilities and helpers
prisma/
  schema.prisma     # Database models
```

## API Overview

| Area | Endpoints |
|------|-----------|
| **Auth** | `POST /api/auth/register`, `login`, `logout`, `reset-password` |
| **Canvases** | `GET/POST /api/canvases`, `GET/PUT/DELETE /api/canvases/[id]`, `import`, `export` |
| **Notes** | `GET/POST /api/canvases/[id]/notes`, `GET/PUT/DELETE /api/notes/[id]`, `duplicate` |
| **Connections** | `GET/POST /api/canvases/[id]/connections`, `DELETE /api/connections/[id]` |
| **Folders** | `GET/POST /api/folders`, `PUT/DELETE /api/folders/[id]` |
| **Search** | `GET /api/search?q=query` |
| **User** | `PUT /api/user/update-profile`, `change-password`, `settings`, `DELETE delete-account` |

## Security

- JWT authentication with token blacklisting
- CSRF protection on all state-changing operations
- Password hashing with bcrypt
- Input validation via Zod schemas
- HTML sanitization with DOMPurify (XSS prevention)
- Rate limiting on sensitive endpoints
- Parameterized queries via Prisma (SQL injection prevention)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

MIT - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with <a href="https://nextjs.org/">Next.js</a>,
  <a href="https://reactflow.dev/">@xyflow/react</a>,
  <a href="https://tailwindcss.com/">Tailwind CSS</a>, and
  <a href="https://www.prisma.io/">Prisma</a>
</p>
