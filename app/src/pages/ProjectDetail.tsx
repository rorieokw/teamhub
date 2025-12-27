import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { updateProject, deleteProject, joinProject, leaveProject } from '../services/projects';
import {
  subscribeToMilestones,
  createMilestone,
  toggleMilestone,
  deleteMilestone,
  updateMilestoneDescription,
  calculateProgress,
} from '../services/milestones';
import {
  subscribeToProjectTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../services/tasks';
import {
  subscribeToProjectDocuments,
  deleteDocument,
} from '../services/documents';
import { getUsersByIds } from '../services/users';
import { createInvite } from '../services/invites';
import { notifyTaskAssigned } from '../services/notifications';
import {
  subscribeToProjectLayout,
  toggleProjectWidgetCollapsed,
  toggleProjectWidgetVisibility,
} from '../services/projectLayouts';
import ConfirmModal from '../components/ui/ConfirmModal';
import TaskModal from '../components/tasks/TaskModal';
import TaskCard from '../components/tasks/TaskCard';
import DocumentLinkForm from '../components/documents/DocumentLinkForm';
import DocumentCard from '../components/documents/DocumentCard';
import SessionControl from '../components/sessions/SessionControl';
import MyProjectTasks from '../components/project/MyProjectTasks';
import QuickNotes from '../components/project/QuickNotes';
import PinnedLinks from '../components/project/PinnedLinks';
import RecentActivity from '../components/project/RecentActivity';
import Deadlines from '../components/project/Deadlines';
import PasswordVault from '../components/project/PasswordVault';
import type { Project, Milestone, User, Task, Document, ProjectWidgetConfig } from '../types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { isAdmin } = useAdmin();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [uploaders, setUploaders] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [newMilestone, setNewMilestone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [taskDeleteLoading, setTaskDeleteLoading] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [editingMilestoneDesc, setEditingMilestoneDesc] = useState<string | null>(null);
  const [milestoneDescInput, setMilestoneDescInput] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [showNewMilestoneNote, setShowNewMilestoneNote] = useState(false);
  const [projectLayout, setProjectLayout] = useState<{
    leftWidgets: ProjectWidgetConfig[];
    rightWidgets: ProjectWidgetConfig[];
  }>({ leftWidgets: [], rightWidgets: [] });
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showEditGithubUrl, setShowEditGithubUrl] = useState(false);
  const [editGithubUrl, setEditGithubUrl] = useState(''  );
  const [savingGithubUrl, setSavingGithubUrl] = useState(false);

  // Subscribe to project
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'projects', id), (doc) => {
      if (doc.exists()) {
        setProject({ id: doc.id, ...doc.data() } as Project);
      } else {
        navigate('/projects');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // Subscribe to milestones
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMilestones(id, (data) => {
      setMilestones(data);
    });

    return () => unsubscribe();
  }, [id]);

  // Subscribe to tasks
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToProjectTasks(id, (data) => {
      setTasks(data);
    });

    return () => unsubscribe();
  }, [id]);

  // Subscribe to documents
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToProjectDocuments(id, (data) => {
      setDocuments(data);
    });

    return () => unsubscribe();
  }, [id]);

  // Load uploaders for documents
  useEffect(() => {
    const uploaderIds = new Set(documents.map((d) => d.uploadedBy));
    const unknownIds = Array.from(uploaderIds).filter((id) => !uploaders.has(id));

    if (unknownIds.length > 0) {
      getUsersByIds(unknownIds).then((users) => {
        setUploaders((prev) => {
          const newMap = new Map(prev);
          users.forEach((user) => newMap.set(user.id, user));
          return newMap;
        });
      });
    }
  }, [documents, uploaders]);

  // Update progress when milestones change
  useEffect(() => {
    if (!project || !id) return;

    const newProgress = calculateProgress(milestones);
    if (newProgress !== project.progress) {
      updateProject(id, { progress: newProgress });
    }
  }, [milestones, project, id]);

  // Load members
  useEffect(() => {
    if (!project?.members) return;

    getUsersByIds(project.members).then(setMembers);
  }, [project?.members]);

  // Subscribe to project layout
  useEffect(() => {
    if (!id || !currentUser) return;

    const unsubscribe = subscribeToProjectLayout(currentUser.uid, id, setProjectLayout);
    return () => unsubscribe();
  }, [id, currentUser]);

  async function handleAddMilestone() {
    if (!newMilestone.trim() || !id) return;

    await createMilestone(id, newMilestone.trim(), milestones.length, newMilestoneDesc.trim() || undefined);
    setNewMilestone('');
    setNewMilestoneDesc('');
    setShowNewMilestoneNote(false);
  }

  async function handleToggleMilestone(milestone: Milestone) {
    await toggleMilestone(milestone.id, !milestone.completed, currentUser?.uid);
  }

  async function handleDeleteMilestone(milestoneId: string) {
    await deleteMilestone(milestoneId);
  }

  async function handleSaveMilestoneDescription(milestoneId: string) {
    await updateMilestoneDescription(milestoneId, milestoneDescInput);
    setEditingMilestoneDesc(null);
    setMilestoneDescInput('');
  }

  function handleStartEditDescription(milestone: Milestone) {
    setEditingMilestoneDesc(milestone.id);
    setMilestoneDescInput(milestone.description || '');
    setExpandedMilestone(milestone.id);
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !project || !currentUser || !userProfile) return;

    setInviteLoading(true);
    setInviteMessage('');

    try {
      // Check if already a member
      const isMember = members.some(
        (m) => m.email.toLowerCase() === inviteEmail.toLowerCase()
      );
      if (isMember) {
        setInviteMessage('This user is already a member');
        return;
      }

      await createInvite({
        projectId: project.id,
        projectName: project.name,
        invitedEmail: inviteEmail.trim(),
        invitedBy: currentUser.uid,
        invitedByName: userProfile.displayName,
      });

      setInviteEmail('');
      setInviteMessage('Invite sent!');
    } catch (err) {
      setInviteMessage('Failed to send invite');
      console.error(err);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleDeleteProject() {
    if (!id) return;

    setDeleteLoading(true);
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCreateTask(data: {
    title: string;
    description: string;
    projectId: string;
    assignedTo: string[];
    priority: Task['priority'];
    status: Task['status'];
    dueDate?: Date;
    blockedBy?: string[];
  }) {
    if (!currentUser || !userProfile || !project) return;

    const taskId = await createTask({
      ...data,
      projectId: project.id,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
      createdBy: currentUser.uid,
    });

    // Notify all assignees except the creator
    for (const assigneeId of data.assignedTo) {
      if (assigneeId !== currentUser.uid) {
        await notifyTaskAssigned(
          assigneeId,
          data.title,
          project.name,
          userProfile.displayName,
          taskId,
          project.id
        );
      }
    }
  }

  async function handleUpdateTask(data: {
    title: string;
    description: string;
    projectId: string;
    assignedTo: string[];
    priority: Task['priority'];
    status: Task['status'];
    dueDate?: Date;
    blockedBy?: string[];
  }) {
    if (!editingTask || !currentUser || !userProfile || !project) return;

    const oldAssignees = Array.isArray(editingTask.assignedTo)
      ? editingTask.assignedTo
      : [editingTask.assignedTo].filter(Boolean);
    const newAssignees = data.assignedTo;

    // Find newly added assignees
    const addedAssignees = newAssignees.filter((id) => !oldAssignees.includes(id));

    await updateTask(editingTask.id, {
      ...data,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
    });

    // Notify newly added assignees
    for (const assigneeId of addedAssignees) {
      if (assigneeId !== currentUser.uid) {
        await notifyTaskAssigned(
          assigneeId,
          data.title,
          project.name,
          userProfile.displayName,
          editingTask.id,
          project.id
        );
      }
    }

    setEditingTask(null);
  }

  async function handleTaskStatusChange(task: Task, status: Task['status']) {
    await updateTaskStatus(task.id, status, currentUser?.uid);
  }

  async function handleDeleteTask() {
    if (!deletingTask) return;

    setTaskDeleteLoading(true);
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setTaskDeleteLoading(false);
    }
  }

  async function handleDeleteDocument() {
    if (!deletingDocument) return;

    try {
      await deleteDocument(deletingDocument.id);
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeletingDocument(null);
    }
  }

  const getMember = (memberId: string) => members.find((m) => m.id === memberId);
  const getAssignees = (assignedTo: string | string[]) => {
    const ids = Array.isArray(assignedTo) ? assignedTo : [assignedTo].filter(Boolean);
    return ids.map((id) => getMember(id)).filter((m): m is User => !!m);
  };
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  // Helper to check if a widget is collapsed
  const isWidgetCollapsed = (widgetId: string) => {
    const left = projectLayout.leftWidgets.find((w) => w.id === widgetId);
    const right = projectLayout.rightWidgets.find((w) => w.id === widgetId);
    return left?.collapsed || right?.collapsed || false;
  };

  // Toggle widget collapsed state
  const handleToggleCollapse = (widgetId: string) => {
    if (!currentUser || !id) return;
    toggleProjectWidgetCollapsed(currentUser.uid, id, projectLayout, widgetId as ProjectWidgetConfig['id']);
  };

  // Check if a widget is visible
  const isWidgetVisible = (widgetId: string) => {
    const widget = [...projectLayout.leftWidgets, ...projectLayout.rightWidgets].find(
      (w) => w.id === widgetId
    );
    return widget?.visible ?? true; // Default to visible if not configured
  };

  // Toggle widget visibility
  const handleToggleVisibility = (widgetId: string) => {
    if (!currentUser || !id) return;
    toggleProjectWidgetVisibility(
      currentUser.uid,
      id,
      projectLayout,
      widgetId as ProjectWidgetConfig['id']
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Project not found</p>
        <Link to="/projects" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  const isOwner = project.createdBy === currentUser?.uid;
  const isMember = currentUser ? project.members?.includes(currentUser.uid) : false;
  const hasAccess = isAdmin || isOwner || isMember;

  // Non-admins can only view projects they are members of or created
  if (!hasAccess) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-4">You don't have permission to view this project.</p>
        <Link to="/projects" className="text-purple-400 hover:text-purple-300 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }
  const completedCount = milestones.filter((m) => m.completed).length;

  const handleJoinProject = async () => {
    if (!currentUser || !id) return;
    try {
      await joinProject(id, currentUser.uid);
    } catch (err) {
      console.error('Failed to join project:', err);
    }
  };

  const handleLeaveProject = async () => {
    if (!currentUser || !id || isOwner) return;
    try {
      await leaveProject(id, currentUser.uid);
    } catch (err) {
      console.error('Failed to leave project:', err);
    }
  };
const handleSaveGithubUrl = async () => {    if (!id) return;    setSavingGithubUrl(true);    try {      await updateProject(id, { githubUrl: editGithubUrl.trim() || undefined });      setShowEditGithubUrl(false);    } catch (err) {      console.error('Failed to update GitHub URL:', err);    } finally {      setSavingGithubUrl(false);    }  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to="/projects"
            className="text-gray-400 hover:text-white text-sm mb-2 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="text-gray-400 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Join/Leave Button */}
          {isMember ? (
            !isOwner && (
              <button
                onClick={handleLeaveProject}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                Leave Project
              </button>
            )
          ) : (
            <button
              onClick={handleJoinProject}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Join Project
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
            >
              Delete
            </button>
          )}

          {/* GitHub Link */}
          {project.githubUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 border border-gray-600 rounded-xl transition-all shadow-lg group"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-base group-hover:text-purple-300 transition-colors">
                    Download Latest Project Files
                  </span>
                  <span className="text-gray-400 text-sm">
                    {project.githubUrl.replace('https://github.com/', '')}
                  </span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditGithubUrl(project.githubUrl || '');
                    setShowEditGithubUrl(true);
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit download URL"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          ) : isAdmin && (
            <button
              onClick={() => {
                setEditGithubUrl('');
                setShowEditGithubUrl(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Add Project Files URL
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Layout: Widgets | Main Content */}
      <div className="flex gap-6">
        {/* Left Column - Widgets Sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          {/* Widgets Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
              </svg>
              Widgets
            </h3>
            <button
              onClick={() => setShowWidgetPicker(!showWidgetPicker)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Customize widgets"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Widget Picker Dropdown */}
          {showWidgetPicker && (
            <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Toggle widgets:</p>
              <div className="space-y-1">
                {(['my-tasks', 'quick-notes', 'pinned-links', 'password-vault', 'deadlines', 'recent-activity'] as const).map((widgetId) => {
                  const isVisible = isWidgetVisible(widgetId);
                  const labels: Record<string, string> = {
                    'my-tasks': '📋 My Tasks',
                    'quick-notes': '📝 Quick Notes',
                    'pinned-links': '🔗 Pinned Links',
                    'password-vault': '🔐 Password Vault',
                    'deadlines': '⏰ Deadlines',
                    'recent-activity': '📊 Recent Activity',
                  };
                  return (
                    <button
                      key={widgetId}
                      onClick={() => handleToggleVisibility(widgetId)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        isVisible ? 'bg-purple-600/20 text-purple-300' : 'bg-gray-700/30 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>{labels[widgetId]}</span>
                      {isVisible && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Widgets List */}
          <div className="space-y-4">
            {isWidgetVisible('my-tasks') && (
              <MyProjectTasks
                tasks={tasks}
                currentUserId={currentUser?.uid || ''}
                members={members}
                collapsed={isWidgetCollapsed('my-tasks')}
                onToggleCollapse={() => handleToggleCollapse('my-tasks')}
              />
            )}
            {isWidgetVisible('quick-notes') && (
              <QuickNotes
                projectId={id || ''}
                userId={currentUser?.uid || ''}
                collapsed={isWidgetCollapsed('quick-notes')}
                onToggleCollapse={() => handleToggleCollapse('quick-notes')}
              />
            )}
            {isWidgetVisible('pinned-links') && (
              <PinnedLinks
                projectId={id || ''}
                userId={currentUser?.uid || ''}
                userName={userProfile?.displayName || ''}
                collapsed={isWidgetCollapsed('pinned-links')}
                onToggleCollapse={() => handleToggleCollapse('pinned-links')}
              />
            )}
            {isWidgetVisible('password-vault') && (
              <PasswordVault
                projectId={id || ''}
                userId={currentUser?.uid || ''}
                userName={userProfile?.displayName || ''}
                collapsed={isWidgetCollapsed('password-vault')}
                onToggleCollapse={() => handleToggleCollapse('password-vault')}
              />
            )}
            {isWidgetVisible('deadlines') && (
              <Deadlines
                tasks={tasks}
                collapsed={isWidgetCollapsed('deadlines')}
                onToggleCollapse={() => handleToggleCollapse('deadlines')}
              />
            )}
            {isWidgetVisible('recent-activity') && (
              <RecentActivity
                projectId={id || ''}
                members={members}
                collapsed={isWidgetCollapsed('recent-activity')}
                onToggleCollapse={() => handleToggleCollapse('recent-activity')}
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Progress Overview */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-2xl font-bold text-white">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  project.progress === 100
                    ? 'bg-green-500'
                    : project.progress >= 50
                    ? 'bg-blue-500'
                    : 'bg-blue-400'
                }`}
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              {completedCount} of {milestones.length} milestones completed
            </p>
          </div>

          {/* Master Plan (Milestones) */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📋 Master Plan
            </h2>

            {/* Add Milestone */}
            <div className="mb-4 bg-gray-700/30 rounded-lg p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !showNewMilestoneNote && handleAddMilestone()}
                  placeholder="Add a milestone..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowNewMilestoneNote(!showNewMilestoneNote)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    showNewMilestoneNote || newMilestoneDesc
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title="Add note"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </button>
                <button
                  onClick={handleAddMilestone}
                  disabled={!newMilestone.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              {showNewMilestoneNote && (
                <div className="mt-3">
                  <textarea
                    value={newMilestoneDesc}
                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    placeholder="Add details or notes for this milestone..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Milestones List */}
            {milestones.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No milestones yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add milestones to track your project progress
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="bg-gray-700/50 rounded-lg group overflow-hidden"
                  >
                    {/* Main milestone row */}
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => handleToggleMilestone(milestone)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          milestone.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-500 hover:border-green-500'
                        }`}
                      >
                        {milestone.completed && '✓'}
                      </button>
                      <button
                        onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
                        className={`flex-1 text-left ${
                          milestone.completed
                            ? 'text-gray-400 line-through'
                            : 'text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {milestone.title}
                          {milestone.description && (
                            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                          )}
                        </span>
                      </button>
                      <button
                        onClick={() => handleStartEditDescription(milestone)}
                        className={`p-1.5 rounded transition-all ${
                          milestone.description
                            ? 'text-purple-400 bg-purple-500/20'
                            : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10'
                        }`}
                        title={milestone.description ? "View/edit note" : "Add note"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 transition-all"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Expanded description section */}
                    {expandedMilestone === milestone.id && (
                      <div className="px-3 pb-3 pt-0 ml-8 border-t border-gray-600/50">
                        {editingMilestoneDesc === milestone.id ? (
                          <div className="pt-3">
                            <textarea
                              value={milestoneDescInput}
                              onChange={(e) => setMilestoneDescInput(e.target.value)}
                              placeholder="Add details about this milestone..."
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleSaveMilestoneDescription(milestone.id)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Save Note
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMilestoneDesc(null);
                                  setMilestoneDescInput('');
                                }}
                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-3">
                            {milestone.description ? (
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{milestone.description}</p>
                            ) : (
                              <button
                                onClick={() => handleStartEditDescription(milestone)}
                                className="text-gray-500 text-sm hover:text-purple-400 transition-colors"
                              >
                                + Add a note...
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Project Tasks */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                ☑ Tasks ({tasks.length})
              </h2>
              <button
                onClick={() => setShowTaskModal(true)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                + Add Task
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* To Do */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  To Do ({todoTasks.length})
                </h3>
                <div className="space-y-2">
                  {todoTasks.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No tasks</p>
                  ) : (
                    todoTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignees={getAssignees(task.assignedTo)}
                        onEdit={setEditingTask}
                        onDelete={setDeletingTask}
                        onStatusChange={handleTaskStatusChange}
                        showProject={false}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  In Progress ({inProgressTasks.length})
                </h3>
                <div className="space-y-2">
                  {inProgressTasks.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No tasks</p>
                  ) : (
                    inProgressTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignees={getAssignees(task.assignedTo)}
                        onEdit={setEditingTask}
                        onDelete={setDeletingTask}
                        onStatusChange={handleTaskStatusChange}
                        showProject={false}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Done */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Done ({doneTasks.length})
                </h3>
                <div className="space-y-2">
                  {doneTasks.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No tasks</p>
                  ) : (
                    doneTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignees={getAssignees(task.assignedTo)}
                        onEdit={setEditingTask}
                        onDelete={setDeletingTask}
                        onStatusChange={handleTaskStatusChange}
                        showProject={false}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Documents */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                📁 Documents ({documents.length})
              </h2>
              <button
                onClick={() => setShowUploadArea(!showUploadArea)}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                {showUploadArea ? 'Cancel' : '+ Add Link'}
              </button>
            </div>

            {/* Add Document Link */}
            {showUploadArea && currentUser && id && (
              <div className="mb-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <DocumentLinkForm
                  projectId={id}
                  userId={currentUser.uid}
                  onSuccess={() => setShowUploadArea(false)}
                />
              </div>
            )}

            {/* Documents List */}
            {documents.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-gray-400">No documents uploaded yet</p>
                <button
                  onClick={() => setShowUploadArea(true)}
                  className="mt-3 text-purple-400 hover:text-purple-300 text-sm"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    uploader={uploaders.get(doc.uploadedBy)}
                    canDelete={doc.uploadedBy === currentUser?.uid || isAdmin}
                    onDelete={() => setDeletingDocument(doc)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Team & Session Row */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Team Members */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                👥 Team ({members.length})
              </h2>
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {member.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {member.displayName}
                        {member.id === project.createdBy && (
                          <span className="text-gray-500 text-xs ml-2">(Owner)</span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Invite */}
              {isOwner && (
                <div className="pt-4 mt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Invite a team member</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviteLoading || !inviteEmail.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
                    >
                      {inviteLoading ? '...' : 'Invite'}
                    </button>
                  </div>
                  {inviteMessage && (
                    <p className={`text-xs mt-2 ${inviteMessage.includes('sent') ? 'text-green-400' : 'text-yellow-400'}`}>
                      {inviteMessage}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Session Control */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                🎮 Work Sessions
              </h2>
              <SessionControl projectId={project.id} projectName={project.name} />
            </div>

            {/* Project Info */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                📊 Project Info
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-400 text-sm">Status</span>
                  <span className="text-white capitalize font-medium">{project.status.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-400 text-sm">Milestones</span>
                  <span className="text-white font-medium">{completedCount} / {milestones.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-400 text-sm">Tasks</span>
                  <span className="text-white font-medium">{doneTasks.length} / {tasks.length} done</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-400 text-sm">Team Size</span>
                  <span className="text-white font-medium">{members.length} members</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* End Main Content */}
      </div>
      {/* End 2-Column Layout */}

      {/* Create Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleCreateTask}
        projects={project ? [project] : []}
        members={members}
        defaultProjectId={project?.id}
        title="Create Task"
      />

      {/* Edit Task Modal */}
      <TaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleUpdateTask}
        task={editingTask}
        projects={project ? [project] : []}
        members={members}
        title="Edit Task"
      />

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"?`}
        confirmText="Delete"
        confirmStyle="danger"
        loading={taskDeleteLoading}
      />

      {/* Delete Project Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? All milestones will also be deleted. This action cannot be undone.`}
        confirmText="Delete"
        confirmStyle="danger"
        loading={deleteLoading}
      />

      {/* Delete Document Confirmation */}
      <ConfirmModal
        isOpen={!!deletingDocument}
        onClose={() => setDeletingDocument(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Document"
        message={`Are you sure you want to delete "${deletingDocument?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmStyle="danger"
      />

      {/* Edit GitHub URL Modal */}
      {showEditGithubUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-4">
              {project?.githubUrl ? 'Edit Project Files URL' : 'Add Project Files URL'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter a URL where team members can download the latest project files (e.g., GitHub, Google Drive, Dropbox).
            </p>
            <input
              type="url"
              value={editGithubUrl}
              onChange={(e) => setEditGithubUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditGithubUrl(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGithubUrl}
                disabled={savingGithubUrl}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {savingGithubUrl ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
