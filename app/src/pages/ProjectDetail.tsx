import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { updateProject, deleteProject } from '../services/projects';
import {
  subscribeToMilestones,
  createMilestone,
  toggleMilestone,
  deleteMilestone,
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
import ConfirmModal from '../components/ui/ConfirmModal';
import TaskModal from '../components/tasks/TaskModal';
import TaskCard from '../components/tasks/TaskCard';
import DocumentLinkForm from '../components/documents/DocumentLinkForm';
import DocumentCard from '../components/documents/DocumentCard';
import SessionControl from '../components/sessions/SessionControl';
import type { Project, Milestone, User, Task, Document } from '../types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

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

  async function handleAddMilestone() {
    if (!newMilestone.trim() || !id) return;

    await createMilestone(id, newMilestone.trim(), milestones.length);
    setNewMilestone('');
  }

  async function handleToggleMilestone(milestone: Milestone) {
    await toggleMilestone(milestone.id, !milestone.completed, currentUser?.uid);
  }

  async function handleDeleteMilestone(milestoneId: string) {
    await deleteMilestone(milestoneId);
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
    assignedTo: string;
    priority: Task['priority'];
    status: Task['status'];
    dueDate?: Date;
  }) {
    if (!currentUser || !userProfile || !project) return;

    const taskId = await createTask({
      ...data,
      projectId: project.id,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
      createdBy: currentUser.uid,
    });

    if (data.assignedTo !== currentUser.uid) {
      await notifyTaskAssigned(
        data.assignedTo,
        data.title,
        project.name,
        userProfile.displayName,
        taskId,
        project.id
      );
    }
  }

  async function handleUpdateTask(data: {
    title: string;
    description: string;
    projectId: string;
    assignedTo: string;
    priority: Task['priority'];
    status: Task['status'];
    dueDate?: Date;
  }) {
    if (!editingTask || !currentUser || !userProfile || !project) return;

    const wasReassigned = editingTask.assignedTo !== data.assignedTo;

    await updateTask(editingTask.id, {
      ...data,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
    });

    if (wasReassigned && data.assignedTo !== currentUser.uid) {
      await notifyTaskAssigned(
        data.assignedTo,
        data.title,
        project.name,
        userProfile.displayName,
        editingTask.id,
        project.id
      );
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
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

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
  const completedCount = milestones.filter((m) => m.completed).length;

  return (
    <div className="max-w-4xl mx-auto">
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
        {isOwner && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
          >
            Delete Project
          </button>
        )}
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Master Plan (Milestones) */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📋 Master Plan
            </h2>

            {/* Add Milestone */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                placeholder="Add a milestone..."
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddMilestone}
                disabled={!newMilestone.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                Add
              </button>
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
                    className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg group"
                  >
                    <button
                      onClick={() => handleToggleMilestone(milestone)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        milestone.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-500 hover:border-green-500'
                      }`}
                    >
                      {milestone.completed && '✓'}
                    </button>
                    <span
                      className={`flex-1 ${
                        milestone.completed
                          ? 'text-gray-400 line-through'
                          : 'text-white'
                      }`}
                    >
                      {milestone.title}
                    </span>
                    <button
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              👥 Team ({members.length})
            </h2>

            {/* Members List */}
            <ul className="space-y-3 mb-4">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {member.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {member.displayName}
                      {member.id === project.createdBy && (
                        <span className="text-gray-500 text-xs ml-2">Owner</span>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{member.email}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Invite */}
            {isOwner && (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Invite by email</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
                  >
                    {inviteLoading ? '...' : 'Invite'}
                  </button>
                </div>
                {inviteMessage && (
                  <p
                    className={`text-sm mt-2 ${
                      inviteMessage.includes('sent')
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {inviteMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Session Control - Start/Stop coding session */}
          <div className="mt-4">
            <SessionControl projectId={project.id} projectName={project.name} />
          </div>

          {/* Project Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Project Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-white capitalize">{project.status.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Milestones</span>
                <span className="text-white">{milestones.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Members</span>
                <span className="text-white">{members.length}</span>
              </div>
            </div>
          </div>
        </div>
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
                    assignee={getMember(task.assignedTo)}
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
                    assignee={getMember(task.assignedTo)}
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
                    assignee={getMember(task.assignedTo)}
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
                canDelete={doc.uploadedBy === currentUser?.uid}
                onDelete={() => setDeletingDocument(doc)}
              />
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
