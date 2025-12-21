import { useState, useEffect } from 'react';
import { subscribeToTaskComments, addComment, deleteComment } from '../../services/comments';
import { logCommentAdded } from '../../services/activities';
import { notifyComment } from '../../services/notifications';
import { useAuth } from '../../contexts/AuthContext';
import type { TaskComment, Task } from '../../types';

interface TaskCommentsProps {
  task: Task;
  projectName: string;
}

export default function TaskComments({ task, projectName }: TaskCommentsProps) {
  const { currentUser, userProfile } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToTaskComments(task.id, setComments);
    return () => unsubscribe();
  }, [task.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || !userProfile) return;

    setLoading(true);
    try {
      await addComment(task.id, currentUser.uid, userProfile.displayName, newComment.trim());

      // Log activity
      await logCommentAdded(
        currentUser.uid,
        userProfile.displayName,
        task.title,
        task.projectId,
        projectName,
        task.id
      );

      // Notify task assignee if it's not the commenter
      if (task.assignedTo !== currentUser.uid) {
        await notifyComment(
          task.assignedTo,
          userProfile.displayName,
          task.title,
          newComment.trim(),
          task.id,
          task.projectId
        );
      }

      // Also notify task creator if different from assignee and commenter
      if (task.createdBy !== currentUser.uid && task.createdBy !== task.assignedTo) {
        await notifyComment(
          task.createdBy,
          userProfile.displayName,
          task.title,
          newComment.trim(),
          task.id,
          task.projectId
        );
      }

      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment(task.id, commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }

  function formatTime(timestamp: { toDate: () => Date } | null): string {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors mb-2"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>Comments ({comments.length})</span>
      </button>

      {expanded && (
        <div className="space-y-3 animate-fade-in">
          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 group">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {comment.userName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-gray-300">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatTime(comment.createdAt)}
                      </span>
                      {currentUser?.uid === comment.userId && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          delete
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 break-words">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || loading}
              className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '...' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
