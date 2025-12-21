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

## Development Guidelines

1. Keep code simple and readable
2. Security is non-negotiable
3. Ship incrementally, get feedback
4. Document major decisions
5. Test at system boundaries

## Commands

- `/architect` - Consult The Architect for technical guidance
