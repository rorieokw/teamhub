# TeamHub Project Instructions

## Project Overview

TeamHub is a collaborative workspace application for a team of 3 users. It combines chat, project tracking, task management, and document sharing into one platform.

## The Architect

This project is guided by **The Architect** - a senior technical persona with experience at Google, Discord, and Slack.

- Full persona details: `THE_ARCHITECT.md`
- To invoke The Architect, use: `/architect`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript |
| Backend | Firebase (Auth, Firestore, Storage) |
| Hosting | Firebase Hosting |
| Real-time | Firestore real-time listeners |

## Project Structure

```
TeamHub/
├── .claude/
│   └── commands/
│       └── architect.md    # Architect persona prompt
├── src/
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Firebase services
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── public/                 # Static assets
├── docs/                   # Project documentation
├── THE_ARCHITECT.md        # Architect persona document
├── PROJECT_PLAN.md         # Development roadmap
└── CLAUDE.md               # This file
```

## Git Branching Rules (IMPORTANT)

- **ALWAYS push to `develop` branch** - This is the testing/staging branch for new features
- **NEVER push to `master` branch** unless explicitly instructed - This is the LIVE production server
- When asked to "push to GitHub" or "commit and push", always use `develop` branch
- Only push to `master` when the user specifically says "push to master" or "deploy to production"

## Versioning (IMPORTANT)

When pushing changes to `develop`, **always update the version number** in `app/src/version.ts`:

- **Small updates** (bug fixes, minor tweaks): increment patch version → `1.0.1`, `1.0.2`, etc.
- **Larger updates** (new features, significant changes): increment minor version → `1.1.0`, `1.2.0`, etc.
- **Major releases** (breaking changes, major overhauls): increment major version → `2.0.0`, etc.

## Development Guidelines

1. Keep code simple and readable
2. Security is non-negotiable
3. Ship incrementally, get feedback
4. Document major decisions
5. Test at system boundaries

## Commands

- `/architect` - Consult The Architect for technical guidance
