# TeamHub Project Plan

*Authored by: The Architect*

---

## Vision

A unified workspace where a small team can communicate, track projects, assign tasks, and share documents - all in one place.

## Target Users

- **Primary:** 3-person team (you + 2 friends)
- **Use Case:** Professional collaboration, project management, communication

---

## Core Features

### 1. Authentication System
- Email/password signup and login
- User profiles with avatars
- Session management

### 2. Dashboard
- Overview of active projects
- Pending tasks assigned to user
- Recent activity feed
- Quick actions

### 3. Projects Module
- Create and manage projects
- Progress tracking (percentage complete)
- Project status (Active, On Hold, Completed)
- Team members assigned to project
- Project description and notes

### 4. Tasks / Jobs System
- Create tasks within projects
- Assign tasks to team members
- Task priority (Low, Medium, High, Urgent)
- Due dates
- Status tracking (To Do, In Progress, Done)
- **Notifications:** Tasks appear as alerts for assigned users

### 5. Real-time Chat
- Team-wide chat channel
- Project-specific chat channels
- Real-time message delivery
- Message history
- Basic formatting

### 6. Document Sharing
- Upload files to projects
- View/download shared documents
- File type icons
- Storage usage tracking

---

## Development Phases

### Phase 1: Foundation
**Goal:** Get the app running with authentication

- [ ] Project setup (React + TypeScript + Vite)
- [ ] Firebase project configuration
- [ ] Authentication (signup, login, logout)
- [ ] Basic routing structure
- [ ] User profile storage in Firestore

**Deliverable:** Users can create accounts and log in

---

### Phase 2: Core Structure
**Goal:** Build the main layout and navigation

- [ ] App shell with sidebar navigation
- [ ] Dashboard page (placeholder content)
- [ ] Projects page (placeholder)
- [ ] Tasks page (placeholder)
- [ ] Chat page (placeholder)
- [ ] Documents page (placeholder)

**Deliverable:** Navigable app structure

---

### Phase 3: Projects
**Goal:** Full project management functionality

- [ ] Firestore data model for projects
- [ ] Create new project form
- [ ] Project list view
- [ ] Project detail view
- [ ] Edit project
- [ ] Progress tracking (manual percentage)
- [ ] Delete project

**Deliverable:** Team can create and track projects

---

### Phase 4: Tasks
**Goal:** Task assignment and tracking

- [ ] Firestore data model for tasks
- [ ] Create task (with project association)
- [ ] Assign task to user
- [ ] Task list view (filterable)
- [ ] Task status updates
- [ ] Due date tracking
- [ ] "My Tasks" view on dashboard

**Deliverable:** Team can assign and track tasks

---

### Phase 5: Notifications
**Goal:** Alert users about assigned tasks

- [ ] Notification data model
- [ ] Create notification on task assignment
- [ ] Notification badge in header
- [ ] Notification dropdown/panel
- [ ] Mark as read functionality
- [ ] Real-time notification updates

**Deliverable:** Users see when they're assigned tasks

---

### Phase 6: Chat
**Goal:** Real-time team communication

- [ ] Firestore data model for messages
- [ ] General team chat channel
- [ ] Real-time message subscription
- [ ] Send messages
- [ ] Message timestamps
- [ ] Scroll to bottom on new messages
- [ ] Project-specific chat channels (optional)

**Deliverable:** Team can chat in real-time

---

### Phase 7: Documents
**Goal:** File sharing capability

- [ ] Firebase Storage setup
- [ ] File upload component
- [ ] Associate files with projects
- [ ] File list view
- [ ] Download files
- [ ] Delete files
- [ ] File type display

**Deliverable:** Team can share files

---

### Phase 8: Polish
**Goal:** Refine the user experience

- [ ] Dashboard with real data
- [ ] Activity feed
- [ ] UI/UX improvements
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsiveness
- [ ] Performance optimization

**Deliverable:** Production-ready application

---

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Timestamp;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed';
  progress: number; // 0-100
  members: string[]; // user IDs
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Task
```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string; // user ID
  dueDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Message
```typescript
interface Message {
  id: string;
  channelId: string; // 'general' or project ID
  content: string;
  senderId: string;
  createdAt: Timestamp;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'task-assigned' | 'project-update' | 'mention';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: Timestamp;
}
```

### Document
```typescript
interface Document {
  id: string;
  projectId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: Timestamp;
}
```

---

## Tech Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Frontend Framework | React | Most popular, huge ecosystem, beginner-friendly |
| Language | TypeScript | Catches bugs early, better tooling |
| Build Tool | Vite | Fast, modern, simple setup |
| Backend | Firebase | No server code, real-time built-in, free tier |
| Database | Firestore | Scales automatically, real-time sync |
| Auth | Firebase Auth | Secure, handles complexity for us |
| Storage | Firebase Storage | Integrated with Firebase, simple API |
| Hosting | Firebase Hosting | One-command deploy, free SSL |
| Styling | Tailwind CSS | Utility-first, rapid development |

---

## Success Criteria

The MVP is complete when:

1. All 3 team members can create accounts and log in
2. Team can create projects and track their progress
3. Team members can assign tasks to each other
4. Assigned tasks appear as notifications
5. Team can chat in real-time
6. Team can upload and share documents
7. Dashboard shows relevant overview for each user

---

*This plan will be updated as the project evolves.*
