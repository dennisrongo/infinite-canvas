# Infinite Canvas

A sophisticated mind-mapping and note-taking web application that allows users to create, organize, and connect notes on an infinite canvas space. Built with modern web technologies and featuring real-time collaboration capabilities, persistent storage, and a rich set of editing tools.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**[Live Demo](https://infinite-canvas-web.netlify.app/)** | **[Project Page](https://dennisrongo.github.io/infinite-canvas/)**

## Screenshots

| Landing Page | Login |
|:---:|:---:|
| ![Landing Page](./docs/screenshots/image.png) | ![Login Page](./docs/screenshots/image1.png) |

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Development](#development)
- [Security Features](#security-features)
- [Accessibility](#accessibility)
- [Contributing](#contributing)
- [License](#license)

## Overview

Infinite Canvas is a full-stack SaaS application that provides an unlimited workspace for visual thinking and note-taking. Users can create multiple canvases, add notes with rich text content, connect notes with relationships, and organize everything into folders. The application supports both light and dark themes, works seamlessly on mobile and desktop devices, and includes robust features like undo/redo, auto-save, and import/export functionality.

### Key Capabilities

- **Infinite Canvas Workspace**: Pan and zoom through an unlimited workspace
- **Rich Note Editing**: Markdown support with syntax highlighting for code
- **Visual Connections**: Create directed connections between notes to show relationships
- **Persistent Storage**: All data saved to PostgreSQL with automatic viewport persistence
- **Folder Organization**: Organize canvases into hierarchical folders
- **Theme Support**: Light and dark mode with user preference persistence
- **Import/Export**: Share canvases via JSON import/export

## Features

### Canvas Management
- Create, rename, and delete canvases
- Folder-based canvas organization
- Viewport persistence (position and zoom saved per canvas)
- Canvas sorting options (recently updated, alphabetical, created date)
- Import/export canvases as JSON
- Deep linking to specific notes via URL parameters

### Note Features
- Rich text editing with full Markdown support
- Draggable and resizable notes
- Note duplication
- Customizable font family and font size per note
- Image embedding and upload
- Directed connections between notes
- Auto-save functionality
- Undo/Redo support for all note operations

### User Management
- Email/password registration and authentication
- Password reset via email
- Profile management (display name)
- Account deletion with data cleanup
- Persistent user settings (theme, sort preferences)
- Session management with JWT tokens

### Search & Discovery
- Global search across all notes and canvases
- Real-time search results
- Search by note title and content

### UI/UX Features
- Responsive design for mobile, tablet, and desktop
- Light/dark theme toggle
- Toast notifications for user feedback
- Modal dialogs for confirmations
- Loading states and skeleton screens
- Error boundaries for graceful error handling
- Touch-friendly interface (44px minimum touch targets)
- Keyboard shortcuts
- Mobile hamburger menu navigation

### Security
- CSRF protection on all state-changing operations
- JWT-based authentication with token blacklisting
- Password hashing with bcrypt
- HTML sanitization to prevent XSS attacks
- Rate limiting on API endpoints
- Input validation with Zod schemas

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.3 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type-safe development |
| @xyflow/react | 12.10.0 | Canvas and node-based interactions |
| Tailwind CSS | 3.4.1 | Utility-first styling |
| React Markdown | 10.1.0 | Markdown rendering |
| DOMPurify | 3.3.1 | HTML sanitization |
| Highlight.js | 11.11.1 | Code syntax highlighting |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 15.1.3 | Backend API |
| Prisma | 6.1.0 | Database ORM |
| PostgreSQL | - | Primary database (via NeonDB) |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT authentication |
| Zod | 3.24.1 | Input validation |

## Architecture

### Application Structure

The application follows a modular architecture with clear separation of concerns:

```
infinite-canvas-web/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── canvases/             # Canvas CRUD operations
│   │   ├── notes/                # Note management
│   │   ├── folders/              # Folder operations
│   │   ├── connections/          # Note connections
│   │   ├── images/               # Image uploads
│   │   ├── search/               # Global search
│   │   └── user/                 # User profile and settings
│   ├── auth/                     # Authentication pages
│   ├── canvas/                   # Canvas view page
│   ├── dashboard/                # Main dashboard
│   ├── settings/                 # User settings page
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
├── prisma/                       # Database schema and migrations
│   └── schema.prisma             # Database models
├── public/                       # Static assets
└── src/                          # Source files
    ├── components/               # React components
    │   ├── canvas/              # Canvas-specific components
    │   ├── layout/              # Layout components
    │   └── ui/                  # Reusable UI components
    ├── contexts/                # React contexts
    ├── hooks/                   # Custom React hooks
    └── lib/                     # Utility functions
```

### Component Architecture

The application uses a component-based architecture with:

- **Context Providers**: Theme context and Toast context for global state
- **Custom Hooks**: Reusable logic for API calls, authentication, and canvas operations
- **TypeScript Interfaces**: Strong typing throughout the application
- **Error Boundaries**: Graceful error handling at component level

## Database Schema

The application uses PostgreSQL with the following main entities:

### Users & Authentication
- **User**: User accounts with email/password authentication
- **UserSettings**: User preferences (theme, canvas sort order)
- **PasswordResetToken**: Tokens for password reset flow
- **RevokedToken**: Blacklisted JWT tokens for secure logout

### Content Organization
- **Folder**: Organizational containers for canvases
- **Canvas**: Infinite canvas workspaces with viewport state

### Notes & Connections
- **Note**: Individual notes with content, position, and styling
- **NoteConnection**: Directed relationships between notes
- **Image**: Uploaded images embedded in notes

### Key Relationships
- Users have many Canvases and Folders
- Canvases belong to a User and optional Folder
- Canvases have many Notes and NoteConnections
- Notes belong to a Canvas and can have many Images
- NoteConnections link two Notes within a Canvas

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout and invalidate token |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/csrf` | Get CSRF token |
| POST | `/api/auth/reset-password-request` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Canvases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canvases` | List user's canvases |
| POST | `/api/canvases` | Create new canvas |
| GET | `/api/canvases/[id]` | Get canvas details |
| PUT | `/api/canvases/[id]` | Update canvas |
| DELETE | `/api/canvases/[id]` | Delete canvas |
| GET | `/api/canvases/[id]/export` | Export canvas as JSON |
| POST | `/api/canvases/import` | Import canvas from JSON |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canvases/[id]/notes` | List canvas notes |
| POST | `/api/canvases/[id]/notes` | Create note |
| GET | `/api/notes/[noteId]` | Get note details |
| PUT | `/api/notes/[noteId]` | Update note |
| DELETE | `/api/notes/[noteId]` | Delete note |
| POST | `/api/notes/[noteId]/duplicate` | Duplicate note |
| GET | `/api/notes/[noteId]/images` | Get note images |
| POST | `/api/notes/[noteId]/images` | Upload image to note |

### Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canvases/[id]/connections` | List canvas connections |
| POST | `/api/canvases/[id]/connections` | Create connection |
| DELETE | `/api/connections/[id]` | Delete connection |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List user folders |
| POST | `/api/folders` | Create folder |
| PUT | `/api/folders/[id]` | Update folder |
| DELETE | `/api/folders/[id]` | Delete folder |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=query` | Search notes and canvases |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/user/update-profile` | Update user profile |
| PUT | `/api/user/change-password` | Change password |
| PUT | `/api/user/settings` | Update user settings |
| DELETE | `/api/user/delete-account` | Delete user account |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/images` | Upload image |

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- PostgreSQL database (NeonDB recommended)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/infinite-canvas-web.git
   cd infinite-canvas-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your environment**
   Edit `.env` and add your database URL and secrets:
   ```env
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   JWT_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret"
   ```

5. **Run database migrations**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT signing | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL for NextAuth | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for NextAuth | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `3000` |

## Project Structure

### Key Directories

- **`app/api/`**: Next.js API routes for backend functionality
- **`app/auth/`**: Authentication pages (login, register, password reset)
- **`app/canvas/`**: Canvas view and editing interface
- **`app/dashboard/`**: Main dashboard with canvas list
- **`src/components/canvas/`**: Canvas-specific React components
- **`src/components/layout/`**: Header, sidebar, and layout components
- **`src/components/ui/`**: Reusable UI components (Button, Modal, Toast, etc.)
- **`src/contexts/`**: React contexts for global state
- **`src/hooks/`**: Custom React hooks
- **`src/lib/`**: Utility functions and helpers
- **`prisma/`**: Database schema and migrations

### Component Highlights

- **`NoteNode.tsx`**: Individual note component with editing and resize capabilities
- **`CanvasView.tsx`**: Main canvas container with pan and zoom
- **`Header.tsx`**: Navigation header with theme toggle
- **`CanvasList.tsx`**: Sidebar canvas list with folders
- **`Toast.tsx`**: Notification system for user feedback

## Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:3015` | Start development server on port 3015 |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Create migration
npx prisma migrate dev --name description
```

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Next.js recommended configuration
- **Prettier**: Code formatting (if configured)

## Security Features

### Authentication & Authorization
- JWT-based stateless authentication
- Password hashing with bcrypt (10 rounds)
- Token blacklisting for secure logout
- Password versioning for forced re-authentication

### Input Validation & Sanitization
- Zod schemas for API input validation
- DOMPurify for HTML sanitization
- Parameterized queries via Prisma (SQL injection prevention)
- File upload restrictions

### Web Security
- CSRF protection on all state-changing operations
- XSS prevention through sanitization
- Rate limiting on sensitive endpoints
- Secure headers configuration

### Data Protection
- Cascade deletion for related data
- User data isolation (scoped queries)
- Secure password reset flow with expiration

## Accessibility

The application is designed with WCAG accessibility guidelines in mind:

- **Keyboard Navigation**: Full keyboard support for all features
- **Focus Management**: Visible focus indicators on all interactive elements
- **Color Contrast**: WCAG AAA compliant color ratios (7:1+)
- **Screen Reader Support**: Proper ARIA labels and roles
- **Touch Targets**: Minimum 44px for mobile touch interactions
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for new features
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Update documentation for significant changes
- Test thoroughly before submitting

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Canvas interactions powered by [@xyflow/react](https://reactflow.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database managed with [Prisma](https://www.prisma.io/)

---

**Version**: 0.1.0 | **Status**: Active Development
