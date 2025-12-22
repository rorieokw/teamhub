import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { subscribeToProjects } from '../services/projects';
import {
  subscribeToDocuments,
  subscribeToProjectDocuments,
  deleteDocument,
} from '../services/documents';
import { getUsersByIds } from '../services/users';
import DocumentLinkForm from '../components/documents/DocumentLinkForm';
import DocumentCard from '../components/documents/DocumentCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import type { Project, Document, User } from '../types';

export default function Documents() {
  const { currentUser } = useAuth();
  const { isAdmin } = useAdmin();
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploaders, setUploaders] = useState<Map<string, User>>(new Map());
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addToProject, setAddToProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  // Subscribe to user's projects (admins see all, non-admins see only their projects)
  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data);
    }, {
      userId: currentUser?.uid,
      isAdmin,
    });

    return () => unsubscribe();
  }, [currentUser?.uid, isAdmin]);

  // Subscribe to documents based on selected project
  useEffect(() => {
    let unsubscribe: () => void;

    if (selectedProject === 'all') {
      unsubscribe = subscribeToDocuments((docs) => {
        // Filter to only show documents from user's projects
        const projectIds = projects.map((p) => p.id);
        const filteredDocs = docs.filter((d) => projectIds.includes(d.projectId));
        setDocuments(filteredDocs);
        setLoading(false);
      });
    } else {
      unsubscribe = subscribeToProjectDocuments(selectedProject, (docs) => {
        setDocuments(docs);
        setLoading(false);
      });
    }

    return () => unsubscribe();
  }, [selectedProject, projects]);

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

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteDocument(deleteTarget.id);
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeleteTarget(null);
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading documents...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Document'}
        </button>
      </div>

      {/* Add Document Section */}
      {showAddForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Add Document Link</h3>
          <p className="text-gray-400 text-sm mb-4">
            Share links to Google Docs, Drive, Dropbox, Notion, Figma, or any other URL with your team.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add to Project
            </label>
            <select
              value={addToProject}
              onChange={(e) => setAddToProject(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {addToProject && currentUser && (
            <DocumentLinkForm
              projectId={addToProject}
              userId={currentUser.uid}
              onSuccess={() => {
                setShowAddForm(false);
                setAddToProject('');
              }}
            />
          )}

          {!addToProject && (
            <p className="text-gray-500 text-center py-4">
              Please select a project first
            </p>
          )}
        </div>
      )}

      {/* Quick Tips */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <h3 className="text-blue-400 font-medium mb-2">Quick Tip</h3>
        <p className="text-gray-300 text-sm">
          Create a shared Google Drive folder for your team, then add links to documents here.
          Everyone on the project will be able to access them!
        </p>
      </div>

      {/* Project Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedProject('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedProject === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Projects
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedProject === project.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-lg font-medium text-white mb-2">No documents yet</h3>
          <p className="text-gray-400 mb-4">Add links to Google Docs, Drive, or other files to share with your team</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Add Document Link
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedProject === 'all' && (
            // Group by project when showing all
            <>
              {projects
                .filter((p) => documents.some((d) => d.projectId === p.id))
                .map((project) => (
                  <div key={project.id} className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
                      {project.name}
                    </h3>
                    <div className="space-y-3">
                      {documents
                        .filter((d) => d.projectId === project.id)
                        .map((doc) => (
                          <DocumentCard
                            key={doc.id}
                            document={doc}
                            uploader={uploaders.get(doc.uploadedBy)}
                            canDelete={doc.uploadedBy === currentUser?.uid}
                            onDelete={() => setDeleteTarget(doc)}
                          />
                        ))}
                    </div>
                  </div>
                ))}
            </>
          )}

          {selectedProject !== 'all' && (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  uploader={uploaders.get(doc.uploadedBy)}
                  canDelete={doc.uploadedBy === currentUser?.uid}
                  onDelete={() => setDeleteTarget(doc)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmStyle="danger"
      />
    </div>
  );
}
