import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import {
  subscribeToProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../services/projects';
import { subscribeToAllUsers } from '../services/users';
import { notifyProjectCompleted } from '../services/notifications';
import ProjectModal from '../components/projects/ProjectModal';
import ProjectCard from '../components/projects/ProjectCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import type { Project, User } from '../types';

export default function Projects() {
  const { currentUser, userProfile } = useAuth();
  const { isAdmin } = useAdmin();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    // Admin can see hidden projects, regular users cannot
    const unsubProjects = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    }, { includeHidden: isAdmin });

    const unsubUsers = subscribeToAllUsers((data) => {
      setUsers(data);
    });

    return () => {
      unsubProjects();
      unsubUsers();
    };
  }, [isAdmin]);

  async function handleCreateProject(data: {
    name: string;
    description: string;
    status: Project['status'];
    progress: number;
    deadline?: Date;
    githubUrl?: string;
  }) {
    if (!currentUser) return;

    await createProject({
      ...data,
      members: [currentUser.uid],
      createdBy: currentUser.uid,
    });
  }

  async function handleUpdateProject(data: {
    name: string;
    description: string;
    status: Project['status'];
    progress: number;
    deadline?: Date;
    githubUrl?: string;
  }) {
    if (!editingProject || !currentUser || !userProfile) return;

    const wasCompleted = editingProject.status !== 'completed' && data.status === 'completed';

    await updateProject(editingProject.id, data);

    // Notify all members if project was just completed
    if (wasCompleted && editingProject.members.length > 0) {
      // Notify all members except the person who marked it complete
      const otherMembers = editingProject.members.filter(m => m !== currentUser.uid);
      if (otherMembers.length > 0) {
        await notifyProjectCompleted(
          otherMembers,
          editingProject.name,
          userProfile.displayName,
          editingProject.id
        );
      }
    }

    setEditingProject(null);
  }

  async function handleDeleteProject() {
    if (!deletingProject) return;

    setDeleteLoading(true);
    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

  const activeProjects = projects.filter((p) => p.status === 'active');
  const onHoldProjects = projects.filter((p) => p.status === 'on-hold');
  const completedProjects = projects.filter((p) => p.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-3">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Projects help you organize your work. Create your first project to start collaborating with your team.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-purple-500/25"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></span>
                Active
                <span className="text-gray-500 text-sm font-normal">({activeProjects.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    users={users}
                    onEdit={setEditingProject}
                    onDelete={setDeletingProject}
                  />
                ))}
              </div>
            </div>
          )}

          {onHoldProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></span>
                On Hold
                <span className="text-gray-500 text-sm font-normal">({onHoldProjects.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {onHoldProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    users={users}
                    onEdit={setEditingProject}
                    onDelete={setDeletingProject}
                  />
                ))}
              </div>
            </div>
          )}

          {completedProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></span>
                Completed
                <span className="text-gray-500 text-sm font-normal">({completedProjects.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    users={users}
                    onEdit={setEditingProject}
                    onDelete={setDeletingProject}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <ProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        title="Create New Project"
      />

      {/* Edit Modal */}
      <ProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleUpdateProject}
        project={editingProject}
        title="Edit Project"
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmStyle="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
