---
name: turborepo-convert
description: Convert an existing project to a Turborepo monorepo. Use when the user wants to set up a monorepo, convert to Turborepo, or restructure a project with multiple apps/packages. Handles moving existing files, configuring workspaces, and preserving Git history.
---

# Turborepo Monorepo Conversion

## Overview

This skill converts an existing project into a Turborepo monorepo structure. It handles:
- Creating the Turborepo scaffold
- Moving existing apps to the `apps/` directory
- Setting up shared packages in `packages/`
- Configuring workspace dependencies
- Preserving Git history

## Prerequisites

- Node.js 18+ installed
- Git repository initialized
- Existing project with frontend and/or backend

## Standard Monorepo Structure

```
project-root/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── backend/      # Backend API (Motia, Express, etc.)
│   └── docs/         # Documentation site (optional)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── config/       # Shared configs (ESLint, TypeScript)
│   └── types/        # Shared TypeScript types
├── turbo.json        # Turborepo configuration
├── package.json      # Root package.json with workspaces
└── pnpm-workspace.yaml  # If using pnpm
```

## Conversion Steps

### Step 1: Backup and Prepare

```bash
# Create a backup branch
git checkout -b pre-monorepo-backup
git push origin pre-monorepo-backup
git checkout main
```

### Step 2: Create Turborepo Structure

Create the directory structure first:

```bash
mkdir -p apps packages
```

### Step 3: Create Root package.json

Create a root `package.json` with workspaces:

```json
{
  "name": "project-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.3.3"
  },
  "packageManager": "npm@10.2.0"
}
```

### Step 4: Create turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Step 5: Move Backend to apps/backend

For a Motia backend:

```bash
# Create apps/backend directory
mkdir -p apps/backend

# Move backend files (preserve structure)
mv src apps/backend/
mv motia.config.ts apps/backend/
mv python_modules apps/backend/
mv middlewares apps/backend/
mv requirements.txt apps/backend/
mv tsconfig.json apps/backend/
mv types.d.ts apps/backend/
```

Update `apps/backend/package.json`:
- Change `name` to `@project/backend`
- Update script paths if needed

### Step 6: Move Frontend to apps/web

```bash
# Move frontend to apps/web
mv frontend apps/web
```

Update `apps/web/package.json`:
- Change `name` to `@project/web`
- Update dependencies to use workspace references

### Step 7: Handle Shared Dependencies

Move common dependencies to root or create shared packages:

```bash
# Create shared config package
mkdir -p packages/config
```

### Step 8: Update .gitignore

Add monorepo-specific ignores:

```
# Turborepo
.turbo

# Node modules in all workspaces
node_modules
**/node_modules

# Build outputs
apps/**/dist
apps/**/.next
packages/**/dist
```

### Step 9: Install Dependencies

```bash
# Remove old node_modules
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Install from root
npm install
```

### Step 10: Verify and Test

```bash
# Run build across all workspaces
npx turbo build

# Run dev servers
npx turbo dev
```

## Git History Preservation

To preserve Git history when moving files:

```bash
# Use git mv instead of mv
git mv src apps/backend/src
git mv frontend apps/web
```

For already-moved files, Git will track renames automatically if the content similarity is high enough.

## Common Issues

### Issue: Workspace dependencies not resolving
**Solution**: Ensure `workspaces` is correctly defined in root package.json and run `npm install` from root.

### Issue: TypeScript path aliases not working
**Solution**: Update `tsconfig.json` in each app to use proper paths relative to new location.

### Issue: Environment variables not loading
**Solution**: Update `.env` file locations or use `dotenv-cli` to specify paths.

## Rollback

If something goes wrong:

```bash
git checkout pre-monorepo-backup
git branch -D main
git checkout -b main
git push --force origin main
```

## Post-Conversion Checklist

- [ ] All apps build successfully with `turbo build`
- [ ] Dev servers start with `turbo dev`
- [ ] Environment variables load correctly
- [ ] Git history preserved for important files
- [ ] CI/CD pipelines updated
- [ ] Docker configurations updated
- [ ] README updated with new commands
