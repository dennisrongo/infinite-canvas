#!/bin/bash

# Infinite Canvas - Initialization Script
# This script sets up the development environment and starts the application

set -e  # Exit on error

echo "🎨 Infinite Canvas - Development Environment Setup"
echo "=================================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm --version) detected"

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env file from template..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/infinite_canvas?schema=public"

# JWT Secret (generate a secure random string)
JWT_SECRET="$(openssl rand -base64 32)"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Application Configuration
NODE_ENV="development"
PORT=3000
EOF
    echo -e "${GREEN}✓${NC} .env file created"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Update DATABASE_URL in .env with your NeonDB credentials${NC}"
    echo "   Get your free NeonDB database at: https://neon.tech/"
    echo ""
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

# Run Prisma migrations
echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"

# Check if Prisma is installed
if ! command -v npx prisma &> /dev/null; then
    echo "Installing Prisma CLI..."
    npx prisma generate
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push schema to database (creates tables if they don't exist)
echo "Applying database schema..."
npx prisma db push

echo -e "${GREEN}✓${NC} Database setup complete"

# Create README if it doesn't exist
if [ ! -f README.md ]; then
    echo ""
    echo "Creating README.md..."
    cat > README.md << 'EOF'
# Infinite Canvas

An infinite canvas note-taking application where users can create, organize, and connect markdown-enabled notes on an unlimited pan/zoom canvas.

## Features

- **Infinite Canvas**: Pan and zoom through unlimited workspace
- **Rich Notes**: Markdown support with images, code blocks, and formatting
- **Visual Connections**: Link notes together with visual connectors
- **Organization**: Folders and multiple canvases
- **Search**: Global search across all notes
- **Themes**: Light and dark mode support
- **Responsive**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 16, React Flow, Tailwind CSS
- **Backend**: Next.js API Routes / Server Actions
- **Database**: NeonDB (PostgreSQL) with Prisma ORM
- **Authentication**: JWT-based auth

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (NeonDB recommended)
- npm or yarn

### Installation

1. Clone this repository
2. Copy `.env.example` to `.env` and configure your database URL
3. Run `./init.sh` to install dependencies and set up the database
4. Start the development server with `npm run dev`

### Environment Variables

Create a `.env` file with the following:

```env
DATABASE_URL="your_neondb_connection_string"
JWT_SECRET="your_jwt_secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"
```

## Development

- **Start dev server**: `npm run dev`
- **Run tests**: `npm test`
- **Database studio**: `npx prisma studio`
- **Apply migrations**: `npx prisma db push`

## Project Status

This project is being built autonomously using AI agents.
- **Total Features**: 185
- **Current Progress**: See features.db for details

## License

MIT
EOF
    echo -e "${GREEN}✓${NC} README.md created"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To start the development server, run:"
echo ""
echo -e "${BLUE}  npm run dev${NC}"
echo ""
echo "Then open your browser to:"
echo -e "${BLUE}  http://localhost:3000${NC}"
echo ""
echo "For more information, see README.md"
echo ""
