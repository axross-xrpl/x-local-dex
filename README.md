# X Local DEX

A modern decentralized exchange monorepo built with cutting-edge web technologies.

## 🚀 Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + React Router
- **Backend**: Express + TypeScript + CORS + Helmet
- **Monorepo**: Turborepo for efficient development and build orchestration
- **UI Library**: Shared React component library
- **Utilities**: Shared TypeScript utilities
- **Code Generation**: Turbo generators for components and utilities

## 📦 Project Structure

```
x-local-dex/
├── apps/
│   ├── frontend/         # React frontend application
│   │   ├── src/
│   │   │   ├── pages/    # React Router pages
│   │   │   ├── components/
│   │   │   └── App.tsx
│   │   └── package.json
│   └── backend/          # Express API server
│       ├── src/
│       │   ├── routes/   # API routes
│       │   ├── middleware/
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── ui/               # Shared React components
│   │   ├── components/   # Reusable UI components
│   │   └── package.json
│   ├── utils/            # Shared TypeScript utilities
│   │   ├── src/
│   │   └── package.json
│   ├── eslint-config/    # Shared ESLint configurations
│   └── typescript-config/ # Shared TypeScript configurations
└── turbo/
    └── generators/       # Code generators for components & utilities
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/axross-xrpl/x-local-dex.git
cd x-local-dex

# Install dependencies
npm install
```

### Development

```bash
# Start all development servers
npm run dev

# Start frontend only (http://localhost:5173)
npm run dev --filter=frontend

# Start backend only (http://localhost:3001)
npm run dev --filter=backend
```

### Build

```bash
# Build all apps and packages
npm run build

# Build specific app
npm run build --filter=frontend
```

## 🎯 Available Scripts

- `npm run dev` - Start development servers for all apps
- `npm run build` - Build all apps and packages
- `npm run lint` - Run ESLint across all packages
- `npm run format` - Format code with Prettier

## 🔧 Code Generation

Generate new components and utilities using Turbo generators:

```bash
# Generate a new React component
npx turbo gen component

# Generate a new utility function
npx turbo gen util
```

## 📡 API Endpoints

The backend server provides the following endpoints:

- `GET /` - Server status
- `GET /api/health` - Health check
- `GET /api/xrpl/account/:address` - Get XRPL account info

## 🎨 Frontend Features

- **React Router**: Multi-page navigation
- **Tailwind CSS**: Utility-first styling
- **Component Library**: Shared UI components from `@repo/ui`
- **TypeScript**: Full type safety
- **Responsive Design**: Mobile-first approach

## 🏗️ Architecture

This project uses Turborepo to manage a monorepo with shared packages:

- **Shared UI Components**: Reusable React components across apps
- **Shared Utilities**: Common TypeScript functions and helpers
- **Shared Configurations**: ESLint and TypeScript configs
- **Code Generators**: Automated component and utility scaffolding

## 🔍 Development Workflow

1. **Create Components**: Use `npx turbo gen component` to scaffold new UI components
2. **Add Utilities**: Use `npx turbo gen util` to create new utility functions
3. **Share Code**: Components and utilities are automatically available across apps
4. **Type Safety**: Full TypeScript support with shared configurations

## 🚦 Environment Variables

Create `.env` files for environment-specific configurations:

### Backend (`apps/backend/.env`)
```env
PORT=3001
```

### Frontend (`apps/frontend/.env`)
```env
VITE_TITLE=X Local DEX
```