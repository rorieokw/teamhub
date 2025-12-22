import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllUsers,
  adminDeleteMessage,
  adminDeletePoll,
  adminDeleteProject,
  adminUpdateProject,
  adminDeleteTask,
  adminSetUserTitle,
  adminBulkDeleteMessages,
  getAllProjects,
  getAllTasks,
  getAdminStats,
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  subscribeToAnnouncements,
  logAdminAction,
  subscribeToAdminLogs,
  type AdminStats,
  type SystemAnnouncement,
  type ActivityLog,
} from '../services/admin';
import { createTask } from '../services/tasks';
import { notifyTaskAssigned } from '../services/notifications';
import { closePoll, reopenPoll } from '../services/polls';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { User, Poll, Message, Project, Task } from '../types';
import { subscribeToAppSettings, updateAppSettings } from '../services/settings';
import { updateUserApprovalStatus, subscribeToPendingUsers } from '../services/users';
import type { AppSettings } from '../types';

type TabType = 'overview' | 'messages' | 'users' | 'projects' | 'tasks' | 'polls' | 'announcements' | 'logs' | 'security';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Search filters
  const [searchTerm, setSearchTerm] = useState('');

  // Selected items for bulk actions
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // User edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Announcement form
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success' | 'error'>('info');

  // Project edit
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // Task creation form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskStatus, setNewTaskStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');

  // Security / Whitelist
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [togglingWhitelist, setTogglingWhitelist] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && !isAdmin) {
      navigate('/');
    }
  }, [currentUser, isAdmin, navigate]);

  // Load all data
  useEffect(() => {
    if (!isAdmin) return;

    // Load stats
    getAdminStats().then(setStats);

    // Load users
    getAllUsers().then(setUsers);

    // Load projects
    getAllProjects().then(setProjects);

    // Load tasks
    getAllTasks().then(setTasks);

    // Subscribe to recent messages
    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setRecentMessages(msgs);
      setLoading(false);
    });

    // Subscribe to all polls
    const pollsQuery = query(
      collection(db, 'polls'),
      orderBy('createdAt', 'desc')
    );
    const unsubPolls = onSnapshot(pollsQuery, (snapshot) => {
      const allPolls = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Poll[];
      setPolls(allPolls);
    });

    // Subscribe to announcements
    const unsubAnnouncements = subscribeToAnnouncements(setAnnouncements);

    // Subscribe to activity logs
    const unsubLogs = subscribeToAdminLogs(setActivityLogs);

    // Subscribe to app settings
    const unsubSettings = subscribeToAppSettings(setAppSettings);

    // Subscribe to pending users
    const unsubPendingUsers = subscribeToPendingUsers(setPendingUsers);

    return () => {
      unsubMessages();
      unsubPolls();
      unsubAnnouncements();
      unsubLogs();
      unsubSettings();
      unsubPendingUsers();
    };
  }, [isAdmin]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await adminDeleteMessage(messageId);
      if (currentUser && userProfile) {
        await logAdminAction('Deleted message', currentUser.uid, userProfile.displayName, messageId);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleBulkDeleteMessages = async () => {
    if (selectedMessages.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMessages.length} messages?`)) return;
    try {
      await adminBulkDeleteMessages(selectedMessages);
      if (currentUser && userProfile) {
        await logAdminAction('Bulk deleted messages', currentUser.uid, userProfile.displayName, undefined, undefined, `${selectedMessages.length} messages`);
      }
      setSelectedMessages([]);
    } catch (error) {
      console.error('Failed to bulk delete messages:', error);
    }
  };

  const handleDeletePoll = async (pollId: string, pollQuestion: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;
    try {
      await adminDeletePoll(pollId);
      if (currentUser && userProfile) {
        await logAdminAction('Deleted poll', currentUser.uid, userProfile.displayName, pollId, pollQuestion);
      }
    } catch (error) {
      console.error('Failed to delete poll:', error);
    }
  };

  const handleTogglePoll = async (poll: Poll) => {
    try {
      if (poll.closed) {
        await reopenPoll(poll.id);
      } else {
        await closePoll(poll.id);
      }
      if (currentUser && userProfile) {
        await logAdminAction(poll.closed ? 'Reopened poll' : 'Closed poll', currentUser.uid, userProfile.displayName, poll.id, poll.question);
      }
    } catch (error) {
      console.error('Failed to toggle poll:', error);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await adminDeleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      if (currentUser && userProfile) {
        await logAdminAction('Deleted project', currentUser.uid, userProfile.displayName, projectId, projectName);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDesc(project.description || '');
  };

  const handleSaveProject = async () => {
    if (!editingProject || !editProjectName.trim()) return;
    try {
      await adminUpdateProject(editingProject.id, {
        name: editProjectName.trim(),
        description: editProjectDesc.trim(),
      });
      setProjects(projects.map(p =>
        p.id === editingProject.id
          ? { ...p, name: editProjectName.trim(), description: editProjectDesc.trim() }
          : p
      ));
      if (currentUser && userProfile) {
        await logAdminAction('Updated project', currentUser.uid, userProfile.displayName, editingProject.id, editProjectName);
      }
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await adminDeleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (currentUser && userProfile) {
        await logAdminAction('Deleted task', currentUser.uid, userProfile.displayName, taskId, taskTitle);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !newTaskProject || !newTaskAssignee || !currentUser) return;
    try {
      const taskId = await createTask({
        projectId: newTaskProject,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        status: newTaskStatus,
        priority: newTaskPriority,
        assignedTo: newTaskAssignee,
        createdBy: currentUser.uid,
      });

      // Refresh tasks list
      const updatedTasks = await getAllTasks();
      setTasks(updatedTasks);

      // Send notification to assignee if not self
      if (newTaskAssignee !== currentUser.uid && userProfile) {
        const project = projects.find((p) => p.id === newTaskProject);
        await notifyTaskAssigned(
          newTaskAssignee,
          newTaskTitle.trim(),
          project?.name || 'Unknown Project',
          userProfile.displayName,
          taskId,
          newTaskProject
        );
      }

      if (userProfile) {
        await logAdminAction('Created task', currentUser.uid, userProfile.displayName, taskId, newTaskTitle);
      }

      // Reset form
      setShowTaskForm(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskProject('');
      setNewTaskAssignee('');
      setNewTaskPriority('medium');
      setNewTaskStatus('todo');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateUserTitle = async () => {
    if (!editingUser) return;
    try {
      await adminSetUserTitle(editingUser.id, editTitle);
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, title: editTitle } : u));
      if (currentUser && userProfile) {
        await logAdminAction('Updated user title', currentUser.uid, userProfile.displayName, editingUser.id, editingUser.displayName, `New title: ${editTitle}`);
      }
      setEditingUser(null);
      setEditTitle('');
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    if (!currentUser || !userProfile) return;
    try {
      await createAnnouncement(
        announcementTitle,
        announcementMessage,
        announcementType,
        currentUser.uid,
        userProfile.displayName
      );
      await logAdminAction('Created announcement', currentUser.uid, userProfile.displayName, undefined, announcementTitle);
      setShowAnnouncementForm(false);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementType('info');
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleToggleAnnouncement = async (announcement: SystemAnnouncement) => {
    try {
      await updateAnnouncement(announcement.id, { active: !announcement.active });
      if (currentUser && userProfile) {
        await logAdminAction(
          announcement.active ? 'Deactivated announcement' : 'Activated announcement',
          currentUser.uid,
          userProfile.displayName,
          announcement.id,
          announcement.title
        );
      }
    } catch (error) {
      console.error('Failed to toggle announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (announcement: SystemAnnouncement) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(announcement.id);
      if (currentUser && userProfile) {
        await logAdminAction('Deleted announcement', currentUser.uid, userProfile.displayName, announcement.id, announcement.title);
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  // Whitelist / Security handlers
  const handleToggleWhitelist = async () => {
    if (!currentUser) return;
    setTogglingWhitelist(true);
    try {
      const newValue = !(appSettings?.whitelistEnabled ?? false);
      await updateAppSettings({ whitelistEnabled: newValue }, currentUser.uid);
      if (userProfile) {
        await logAdminAction(
          newValue ? 'Enabled whitelist mode' : 'Disabled whitelist mode',
          currentUser.uid,
          userProfile.displayName
        );
      }
    } catch (error) {
      console.error('Failed to toggle whitelist:', error);
    } finally {
      setTogglingWhitelist(false);
    }
  };

  const handleApproveUser = async (user: User) => {
    if (!currentUser || !userProfile) return;
    try {
      await updateUserApprovalStatus(user.id, 'approved');
      await logAdminAction('Approved user', currentUser.uid, userProfile.displayName, user.id, user.displayName);
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleRejectUser = async (user: User) => {
    if (!currentUser || !userProfile) return;
    if (!confirm(`Are you sure you want to reject ${user.displayName}? They won't be able to access the app.`)) return;
    try {
      await updateUserApprovalStatus(user.id, 'rejected');
      await logAdminAction('Rejected user', currentUser.uid, userProfile.displayName, user.id, user.displayName);
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  const formatDate = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleString();
  };

  const formatRelativeTime = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.displayName || 'Unknown';
  };

  // Filter functions
  const filteredMessages = recentMessages.filter(msg =>
    !searchTerm ||
    msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getUserName(msg.senderId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    !searchTerm ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    !searchTerm ||
    project.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTasks = tasks.filter(task =>
    !searchTerm ||
    task.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPolls = polls.filter(poll =>
    !searchTerm ||
    poll.question?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
    { id: 'security', label: 'Security', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, badge: pendingUsers.length > 0 ? pendingUsers.length : undefined },
    { id: 'users', label: 'Users', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'messages', label: 'Messages', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
    { id: 'projects', label: 'Projects', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
    { id: 'tasks', label: 'Tasks', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { id: 'polls', label: 'Polls', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'announcements', label: 'Announcements', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> },
    { id: 'logs', label: 'Activity Logs', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Full control over TeamHub</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchTerm('');
              setSelectedMessages([]);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar (for applicable tabs) */}
      {['messages', 'users', 'projects', 'tasks', 'polls'].includes(activeTab) && (
        <div className="mb-4">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: 'Users', value: stats.totalUsers, color: 'blue', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
              { label: 'Messages', value: stats.totalMessages, color: 'purple', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> },
              { label: 'Projects', value: stats.totalProjects, color: 'cyan', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
              { label: 'Tasks', value: stats.totalTasks, color: 'orange', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
              { label: 'Completed', value: stats.completedTasks, color: 'green', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              { label: 'Polls', value: stats.totalPolls, color: 'pink', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
              { label: 'Active Polls', value: stats.activePolls, color: 'emerald', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                    <svg className={`w-5 h-5 text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {stat.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('announcements')}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Create Announcement
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Users
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Moderate Messages
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className="px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Activity Logs
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">Recent Admin Activity</h3>
            {activityLogs.length === 0 ? (
              <p className="text-gray-400 text-sm">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{log.adminName}</span>
                        {' '}{log.action}
                        {log.targetName && <span className="text-gray-400"> - {log.targetName}</span>}
                      </p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Messages</h3>
              <p className="text-xs text-gray-400">{filteredMessages.length} messages</p>
            </div>
            {selectedMessages.length > 0 && (
              <button
                onClick={handleBulkDeleteMessages}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
              >
                Delete Selected ({selectedMessages.length})
              </button>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No messages found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-400 w-10">
                      <input
                        type="checkbox"
                        checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMessages(filteredMessages.map(m => m.id));
                          } else {
                            setSelectedMessages([]);
                          }
                        }}
                        className="rounded bg-white/10 border-white/20"
                      />
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">User</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Message</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Time</th>
                    <th className="text-right p-3 text-xs font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(msg.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMessages([...selectedMessages, msg.id]);
                            } else {
                              setSelectedMessages(selectedMessages.filter(id => id !== msg.id));
                            }
                          }}
                          className="rounded bg-white/10 border-white/20"
                        />
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-white">{getUserName(msg.senderId)}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-300 truncate block max-w-xs">
                          {msg.content || (msg.images?.length ? '[Image]' : '[Empty]')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-500">{formatRelativeTime(msg.createdAt)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Users</h3>
            <p className="text-xs text-gray-400">{filteredUsers.length} registered users</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No users found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">User</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Email</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Title</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Joined</th>
                    <th className="text-right p-3 text-xs font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                            {user.avatarUrl?.startsWith('http') ? (
                              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : user.avatarUrl ? (
                              <span className="text-base">{user.avatarUrl}</span>
                            ) : (
                              user.displayName?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-sm text-white">{user.displayName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">{user.email}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-purple-400">{user.title || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-500">{formatDate(user.createdAt)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditTitle(user.title || '');
                          }}
                          className="px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          Edit Title
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Projects</h3>
            <p className="text-xs text-gray-400">{filteredProjects.length} projects</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No projects found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Project</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Owner</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Members</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Created</th>
                    <th className="text-right p-3 text-xs font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg"
                            style={{ backgroundColor: '#8b5cf6' }}
                          >
                            📁
                          </div>
                          <span className="text-sm text-white">{project.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">{getUserName(project.createdBy)}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">{project.members?.length || 1}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-500">{formatDate(project.createdAt)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="px-3 py-1 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Create Task Button */}
          {!showTaskForm && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </button>
          )}

          {/* Task Creation Form */}
          {showTaskForm && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Task Title *</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Task description (optional)"
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Project *</label>
                    <select
                      value={newTaskProject}
                      onChange={(e) => setNewTaskProject(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="" className="bg-gray-900">Select project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Assign To *</label>
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="" className="bg-gray-900">Select user</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id} className="bg-gray-900">{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="low" className="bg-gray-900">Low</option>
                      <option value="medium" className="bg-gray-900">Medium</option>
                      <option value="high" className="bg-gray-900">High</option>
                      <option value="urgent" className="bg-gray-900">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(e.target.value as 'todo' | 'in-progress' | 'done')}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="todo" className="bg-gray-900">To Do</option>
                      <option value="in-progress" className="bg-gray-900">In Progress</option>
                      <option value="done" className="bg-gray-900">Done</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowTaskForm(false);
                      setNewTaskTitle('');
                      setNewTaskDesc('');
                      setNewTaskProject('');
                      setNewTaskAssignee('');
                      setNewTaskPriority('medium');
                      setNewTaskStatus('todo');
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim() || !newTaskProject || !newTaskAssignee}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">Tasks</h3>
              <p className="text-xs text-gray-400">{filteredTasks.length} tasks</p>
            </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No tasks found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Task</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Priority</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Assignee</th>
                    <th className="text-right p-3 text-xs font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <span className="text-sm text-white truncate block max-w-xs">{task.title}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">
                          {task.assignedTo ? getUserName(task.assignedTo) : 'Unassigned'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Polls Tab */}
      {activeTab === 'polls' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Polls</h3>
            <p className="text-xs text-gray-400">{filteredPolls.length} total polls</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredPolls.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No polls found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Question</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Created By</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-400">Created</th>
                    <th className="text-right p-3 text-xs font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPolls.map((poll) => (
                    <tr key={poll.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <span className="text-sm text-white truncate block max-w-xs">{poll.question}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">{poll.createdByName}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          poll.closed
                            ? 'bg-gray-500/20 text-gray-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {poll.closed ? 'Closed' : 'Active'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-500">{formatDate(poll.createdAt)}</span>
                      </td>
                      <td className="p-3 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTogglePoll(poll)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            poll.closed
                              ? 'text-green-400 hover:bg-green-500/10'
                              : 'text-orange-400 hover:bg-orange-500/10'
                          }`}
                        >
                          {poll.closed ? 'Reopen' : 'Close'}
                        </button>
                        <button
                          onClick={() => handleDeletePoll(poll.id, poll.question)}
                          className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {/* Create Announcement Button */}
          {!showAnnouncementForm && (
            <button
              onClick={() => setShowAnnouncementForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Announcement
            </button>
          )}

          {/* Announcement Form */}
          {showAnnouncementForm && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">New Announcement</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Message"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
                <div className="flex gap-2">
                  {(['info', 'success', 'warning', 'error'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setAnnouncementType(type)}
                      className={`px-3 py-1 text-xs rounded-lg capitalize transition-colors ${
                        announcementType === type
                          ? type === 'info' ? 'bg-blue-500 text-white' :
                            type === 'success' ? 'bg-green-500 text-white' :
                            type === 'warning' ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAnnouncementForm(false);
                      setAnnouncementTitle('');
                      setAnnouncementMessage('');
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAnnouncement}
                    disabled={!announcementTitle.trim() || !announcementMessage.trim()}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Announcements List */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">All Announcements</h3>
              <p className="text-xs text-gray-400">{announcements.length} announcements</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No announcements</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-4 hover:bg-white/5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              announcement.type === 'info' ? 'bg-blue-500' :
                              announcement.type === 'success' ? 'bg-green-500' :
                              announcement.type === 'warning' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}></span>
                            <h4 className="font-medium text-white">{announcement.title}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              announcement.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {announcement.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{announcement.message}</p>
                          <p className="text-xs text-gray-500">
                            By {announcement.createdByName} • {formatRelativeTime(announcement.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAnnouncement(announcement)}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              announcement.active
                                ? 'text-orange-400 hover:bg-orange-500/10'
                                : 'text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {announcement.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement)}
                            className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'logs' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Activity Logs</h3>
            <p className="text-xs text-gray-400">Admin actions and system events</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {activityLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No activity logs</div>
            ) : (
              <div className="divide-y divide-white/5">
                {activityLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="font-medium text-orange-400">{log.adminName}</span>
                          {' '}<span className="text-gray-300">{log.action}</span>
                        </p>
                        {log.targetName && (
                          <p className="text-sm text-gray-400">Target: {log.targetName}</p>
                        )}
                        {log.details && (
                          <p className="text-xs text-gray-500">{log.details}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Whitelist Toggle */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Whitelist Mode</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    When enabled, new users must be approved by an admin before they can access the application.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      appSettings?.whitelistEnabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        appSettings?.whitelistEnabled ? 'bg-green-400' : 'bg-gray-400'
                      }`}></span>
                      {appSettings?.whitelistEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleWhitelist}
                disabled={togglingWhitelist}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  appSettings?.whitelistEnabled ? 'bg-green-500' : 'bg-gray-600'
                } ${togglingWhitelist ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    appSettings?.whitelistEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Pending Users */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Pending Approvals</h3>
                  <p className="text-xs text-gray-400">Users waiting for access approval</p>
                </div>
                {pendingUsers.length > 0 && (
                  <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                    {pendingUsers.length} pending
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {pendingUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-400">No pending approvals</p>
                  <p className="text-gray-500 text-sm mt-1">All users have been reviewed</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium overflow-hidden">
                            {user.avatarUrl?.startsWith('http') ? (
                              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : user.avatarUrl ? (
                              <span className="text-lg">{user.avatarUrl}</span>
                            ) : (
                              user.displayName?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.displayName}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              Signed up {formatRelativeTime(user.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveUser(user)}
                            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(user)}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="glass-card rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="text-blue-400 font-medium">How whitelist mode works</p>
                <ul className="text-gray-400 mt-2 space-y-1">
                  <li>- New users who sign up will see a "Pending Approval" screen</li>
                  <li>- You'll see them in the Pending Approvals list above</li>
                  <li>- Approved users get full access to the application</li>
                  <li>- Rejected users see an "Access Denied" screen</li>
                  <li>- Admins always have access regardless of whitelist status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <h3 className="text-lg font-semibold text-white mb-4">Edit User: {editingUser.displayName}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Team Lead, Developer, Designer"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditTitle('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateUserTitle}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  placeholder="Project description"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setEditProjectName('');
                    setEditProjectDesc('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={!editProjectName.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
