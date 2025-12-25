import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { subscribeToProjects } from '../services/projects';
import {
  subscribeToMyTasks,
  subscribeToAssignedByMe,
  createTask,
  updateTask,
  updateTaskStatus,
  removeUserFromTask,
} from '../services/tasks';
import { getUsersByIds } from '../services/users';
import { notifyTaskAssigned } from '../services/notifications';
import { logTaskCreated, logTaskCompleted } from '../services/activities';
import TaskModal from '../components/tasks/TaskModal';
import TaskCard from '../components/tasks/TaskCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import type { Task, Project, User } from '../types';

type ColumnId = 'todo' | 'in-progress' | 'done';
type FilterType = 'all' | 'done' | 'pending';
type ViewMode = 'my-tasks' | 'assigned-by-me';

const columnConfig: Record<ColumnId, { title: string; color: string; bgColor: string }> = {
  'todo': { title: 'To Do', color: 'bg-gray-500', bgColor: 'bg-white/10' },
  'in-progress': { title: 'In Progress', color: 'bg-blue-500', bgColor: 'bg-blue-500/20' },
  'done': { title: 'Done', color: 'bg-green-500', bgColor: 'bg-green-500/20' },
};

export default function Tasks() {
  const { currentUser, userProfile } = useAuth();
  const { isAdmin } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('my-tasks');

  // Get filter from URL or default to 'all'
  const urlFilter = searchParams.get('filter') as FilterType | null;
  const [filter, setFilter] = useState<FilterType>(urlFilter || 'all');

  // Update filter when URL changes
  useEffect(() => {
    if (urlFilter && ['all', 'done', 'pending'].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, [urlFilter]);

  // Update URL when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    if (newFilter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', newFilter);
    }
    setSearchParams(searchParams);
  };

  // Subscribe to projects (admins see all, non-admins see only their projects)
  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data);
    }, {
      userId: currentUser?.uid,
      isAdmin,
    });

    return () => unsubscribe();
  }, [currentUser?.uid, isAdmin]);

  // Subscribe to tasks based on view mode
  useEffect(() => {
    if (!currentUser?.uid || projects.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const projectIds = projects.map(p => p.id);

    const subscribeFunc = viewMode === 'my-tasks'
      ? subscribeToMyTasks
      : subscribeToAssignedByMe;

    const unsubscribe = subscribeFunc(currentUser.uid, projectIds, (data) => {
      // Merge with local state to preserve optimistic updates
      setTasks(prevTasks => {
        if (pendingUpdates.size === 0) {
          return data;
        }
        // Keep local version of tasks with pending updates
        return data.map(serverTask => {
          if (pendingUpdates.has(serverTask.id)) {
            const localTask = prevTasks.find(t => t.id === serverTask.id);
            return localTask || serverTask;
          }
          return serverTask;
        });
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, projects, pendingUpdates, viewMode]);

  // Load all members from all projects
  useEffect(() => {
    const allMemberIds = new Set<string>();
    projects.forEach((p) => {
      p.members.forEach((m) => allMemberIds.add(m));
    });

    if (allMemberIds.size > 0) {
      getUsersByIds(Array.from(allMemberIds)).then(setMembers);
    }
  }, [projects]);

  async function handleCreateTask(data: {
    title: string;
    description: string;
    projectId: string;
    assignedTo: string[];
    priority: Task['priority'];
    status: Task['status'];
    dueDate?: Date;
  }) {
    if (!currentUser || !userProfile) return;

    const taskId = await createTask({
      ...data,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
      createdBy: currentUser.uid,
    });

    // Log activity
    const project = projects.find((p) => p.id === data.projectId);
    await logTaskCreated(
      currentUser.uid,
      userProfile.displayName,
      data.title,
      data.projectId,
      project?.name || 'Unknown Project',
      taskId
    );

    // Send notification to all assignees except the creator
    for (const assigneeId of data.assignedTo) {
      if (assigneeId !== currentUser.uid) {
        await notifyTaskAssigned(
          assigneeId,
          data.title,
          project?.name || 'Unknown Project',
          userProfile.displayName,
          taskId,
          data.projectId
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
  }) {
    if (!editingTask || !currentUser || !userProfile) return;

    // Get previous assignees (handle backwards compatibility)
    const previousAssignees = Array.isArray(editingTask.assignedTo)
      ? editingTask.assignedTo
      : [editingTask.assignedTo].filter(Boolean);

    // Find newly added assignees
    const newAssignees = data.assignedTo.filter(id => !previousAssignees.includes(id));

    await updateTask(editingTask.id, {
      ...data,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
    });

    // Send notification to newly added assignees (except self)
    const project = projects.find((p) => p.id === data.projectId);
    for (const assigneeId of newAssignees) {
      if (assigneeId !== currentUser.uid) {
        await notifyTaskAssigned(
          assigneeId,
          data.title,
          project?.name || 'Unknown Project',
          userProfile.displayName,
          editingTask.id,
          data.projectId
        );
      }
    }

    setEditingTask(null);
  }

  async function handleStatusChange(task: Task, status: Task['status']) {
    await updateTaskStatus(task.id, status, currentUser?.uid);

    // Log activity if task is completed
    if (status === 'done' && currentUser && userProfile) {
      const project = projects.find((p) => p.id === task.projectId);
      await logTaskCompleted(
        currentUser.uid,
        userProfile.displayName,
        task.title,
        task.projectId,
        project?.name || 'Unknown Project',
        task.id
      );
    }
  }

  async function handleRemoveTask() {
    if (!deletingTask || !currentUser?.uid) return;

    setDeleteLoading(true);
    try {
      await removeUserFromTask(deletingTask.id, currentUser.uid);
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to remove task:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Check if current user is the only assignee (for delete message)
  const isOnlyAssignee = (task: Task | null): boolean => {
    if (!task) return false;
    const assignees = getAssignees(task);
    return assignees.length <= 1;
  };

  // Handle drag end
  async function handleDragEnd(result: DropResult) {
    setDraggingTaskId(null);

    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task being dragged
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    // Update the task status
    const newStatus = destination.droppableId as Task['status'];
    if (newStatus !== task.status) {
      // Mark this task as having a pending update
      setPendingUpdates(prev => new Set(prev).add(draggableId));

      // Optimistically update local state immediately
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === draggableId ? { ...t, status: newStatus } : t
        )
      );

      // Then update Firebase
      try {
        await handleStatusChange(task, newStatus);
      } catch (err) {
        console.error('Failed to update task status:', err);
        // Revert on error
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === draggableId ? { ...t, status: task.status } : t
          )
        );
      } finally {
        // Remove from pending updates after a short delay to let Firebase sync
        setTimeout(() => {
          setPendingUpdates(prev => {
            const next = new Set(prev);
            next.delete(draggableId);
            return next;
          });
        }, 1000);
      }
    }
  }

  // Helper to normalize assignedTo (backwards compatibility: string -> array)
  const getAssignees = (task: Task): string[] => {
    if (Array.isArray(task.assignedTo)) return task.assignedTo;
    return task.assignedTo ? [task.assignedTo] : [];
  };

  // Filter tasks (all tasks are already "mine" since we only fetch assigned tasks)
  const filteredTasks = tasks.filter((t) => {
    switch (filter) {
      case 'done':
        return t.status === 'done';
      case 'pending':
        return t.status !== 'done';
      default:
        return true;
    }
  });

  const getTasksByStatus = (status: ColumnId) =>
    filteredTasks.filter((t) => t.status === status);

  const getMembers = (ids: string[]) => members.filter((m) => ids.includes(m.id));
  const getProject = (id: string) => projects.find((p) => p.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-3">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {viewMode === 'my-tasks' ? 'My Tasks' : 'Assigned by Me'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}{' '}
            {viewMode === 'my-tasks' ? 'assigned to you' : 'you assigned to others'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button
              onClick={() => setViewMode('my-tasks')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'my-tasks'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setViewMode('assigned-by-me')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'assigned-by-me'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Assigned by Me
            </button>
          </div>
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as FilterType)}
            className="px-4 py-2.5 glass border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-transparent"
          >
            <option value="all" className="bg-[#2d2a4a]">All Tasks</option>
            <option value="pending" className="bg-[#2d2a4a]">Pending Tasks</option>
            <option value="done" className="bg-[#2d2a4a]">Completed Tasks</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={projects.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:shadow-none"
          >
            + New Task
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-4">Create a project first to start adding tasks</p>
        </div>
      ) : (
        <DragDropContext
          onDragStart={(start) => viewMode === 'my-tasks' && setDraggingTaskId(start.draggableId)}
          onDragEnd={viewMode === 'my-tasks' ? handleDragEnd : () => {}}
        >
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
            {(['todo', 'in-progress', 'done'] as ColumnId[]).map((columnId) => {
              const config = columnConfig[columnId];
              const columnTasks = getTasksByStatus(columnId);

              return (
                <div key={columnId} className={`rounded-xl flex flex-col min-h-[400px] ${draggingTaskId ? 'bg-[#1e1b2e] border border-white/10' : 'glass'}`}>
                  <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <span className={`w-3 h-3 ${config.color} rounded-full shadow-lg`}></span>
                    <h2 className="text-lg font-semibold text-white">{config.title}</h2>
                    <span className={`ml-auto px-2 py-0.5 ${config.bgColor} rounded-full text-sm ${
                      columnId === 'todo' ? 'text-gray-400' :
                      columnId === 'in-progress' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {columnTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={columnId} isDropDisabled={viewMode === 'assigned-by-me'}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver && viewMode === 'my-tasks' ? 'bg-purple-500/10' : ''
                        }`}
                      >
                        {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="text-gray-500 text-sm text-center py-8 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            {columnId === 'todo' ? 'No tasks yet' :
                             columnId === 'in-progress' ? 'No tasks in progress' :
                             'No completed tasks'}
                          </div>
                        ) : (
                          columnTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={viewMode === 'assigned-by-me'}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    zIndex: draggingTaskId === task.id ? 9999 : 'auto',
                                  }}
                                  className={draggingTaskId === task.id ? 'relative' : ''}
                                >
                                  <TaskCard
                                    task={task}
                                    assignees={getMembers(getAssignees(task))}
                                    project={getProject(task.projectId)}
                                    onEdit={setEditingTask}
                                    onDelete={viewMode === 'my-tasks' ? setDeletingTask : undefined}
                                    onStatusChange={viewMode === 'my-tasks' ? handleStatusChange : undefined}
                                    isDragging={draggingTaskId === task.id}
                                    isReadOnly={viewMode === 'assigned-by-me'}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Create Modal */}
      <TaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        projects={projects}
        members={members}
        title="Create New Task"
      />

      {/* Edit Modal */}
      <TaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleUpdateTask}
        task={editingTask}
        projects={projects}
        members={members}
        title="Edit Task"
      />

      {/* Delete/Remove Confirmation */}
      <ConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleRemoveTask}
        title={isOnlyAssignee(deletingTask) ? "Delete Task" : "Remove Task"}
        message={
          isOnlyAssignee(deletingTask)
            ? `Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`
            : `Are you sure you want to remove "${deletingTask?.title}" from your task list? The task will still be visible to other assignees.`
        }
        confirmText={isOnlyAssignee(deletingTask) ? "Delete" : "Remove"}
        confirmStyle="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
