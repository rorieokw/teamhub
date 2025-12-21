import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToProjects } from '../services/projects';
import {
  subscribeToAllAccessibleTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../services/tasks';
import { getUsersByIds } from '../services/users';
import { notifyTaskAssigned } from '../services/notifications';
import { logTaskCreated, logTaskCompleted } from '../services/activities';
import TaskModal from '../components/tasks/TaskModal';
import TaskCard from '../components/tasks/TaskCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import type { Task, Project, User } from '../types';

type ColumnId = 'todo' | 'in-progress' | 'done';
type FilterType = 'all' | 'mine' | 'done' | 'pending';

const columnConfig: Record<ColumnId, { title: string; color: string; bgColor: string }> = {
  'todo': { title: 'To Do', color: 'bg-gray-500', bgColor: 'bg-white/10' },
  'in-progress': { title: 'In Progress', color: 'bg-blue-500', bgColor: 'bg-blue-500/20' },
  'done': { title: 'Done', color: 'bg-green-500', bgColor: 'bg-green-500/20' },
};

export default function Tasks() {
  const { currentUser, userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Get filter from URL or default to 'all'
  const urlFilter = searchParams.get('filter') as FilterType | null;
  const [filter, setFilter] = useState<FilterType>(urlFilter || 'all');

  // Update filter when URL changes
  useEffect(() => {
    if (urlFilter && ['all', 'mine', 'done', 'pending'].includes(urlFilter)) {
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

  // Subscribe to projects user is a member of
  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      // Filter to only projects user is a member of
      const userProjects = data.filter(
        (p) => currentUser && p.members.includes(currentUser.uid)
      );
      setProjects(userProjects);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to tasks from user's projects
  useEffect(() => {
    if (projects.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const projectIds = projects.map((p) => p.id);
    const unsubscribe = subscribeToAllAccessibleTasks(projectIds, (data) => {
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projects]);

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
    assignedTo: string;
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

    // Send notification if assigning to someone else
    if (data.assignedTo !== currentUser.uid) {
      await notifyTaskAssigned(
        data.assignedTo,
        data.title,
        project?.name || 'Unknown Project',
        userProfile.displayName,
        taskId,
        data.projectId
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
    if (!editingTask || !currentUser || !userProfile) return;

    const wasReassigned = editingTask.assignedTo !== data.assignedTo;

    await updateTask(editingTask.id, {
      ...data,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
    });

    // Send notification if reassigned to someone else
    if (wasReassigned && data.assignedTo !== currentUser.uid) {
      const project = projects.find((p) => p.id === data.projectId);
      await notifyTaskAssigned(
        data.assignedTo,
        data.title,
        project?.name || 'Unknown Project',
        userProfile.displayName,
        editingTask.id,
        data.projectId
      );
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

  async function handleDeleteTask() {
    if (!deletingTask) return;

    setDeleteLoading(true);
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Handle drag end
  async function handleDragEnd(result: DropResult) {
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
      await handleStatusChange(task, newStatus);
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    switch (filter) {
      case 'mine':
        return t.assignedTo === currentUser?.uid;
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

  const getMember = (id: string) => members.find((m) => m.id === id);
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
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400 text-sm mt-1">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} - Drag to move between columns
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as FilterType)}
            className="px-4 py-2.5 glass border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-transparent"
          >
            <option value="all" className="bg-[#2d2a4a]">All Tasks</option>
            <option value="mine" className="bg-[#2d2a4a]">My Tasks</option>
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
            {(['todo', 'in-progress', 'done'] as ColumnId[]).map((columnId) => {
              const config = columnConfig[columnId];
              const columnTasks = getTasksByStatus(columnId);

              return (
                <div key={columnId} className="glass rounded-xl flex flex-col min-h-[400px] overflow-hidden">
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

                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver ? 'bg-purple-500/10' : ''
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
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={provided.draggableProps.style}
                                >
                                  <TaskCard
                                    task={task}
                                    assignee={getMember(task.assignedTo)}
                                    project={getProject(task.projectId)}
                                    onEdit={setEditingTask}
                                    onDelete={setDeletingTask}
                                    onStatusChange={handleStatusChange}
                                    isDragging={snapshot.isDragging}
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

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmStyle="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
