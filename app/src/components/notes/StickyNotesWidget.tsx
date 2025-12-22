import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from '../../services/stickyNotes';
import type { StickyNote, StickyNoteColor } from '../../types';

// Realistic sticky note colors - solid pastel colors like real Post-its
const NOTE_COLORS: { value: StickyNoteColor; bg: string; fold: string; text: string; shadow: string }[] = [
  { value: 'yellow', bg: '#fef08a', fold: '#eab308', text: '#713f12', shadow: 'rgba(234, 179, 8, 0.3)' },
  { value: 'pink', bg: '#fecdd3', fold: '#f43f5e', text: '#881337', shadow: 'rgba(244, 63, 94, 0.3)' },
  { value: 'blue', bg: '#bfdbfe', fold: '#3b82f6', text: '#1e3a8a', shadow: 'rgba(59, 130, 246, 0.3)' },
  { value: 'green', bg: '#bbf7d0', fold: '#22c55e', text: '#14532d', shadow: 'rgba(34, 197, 94, 0.3)' },
  { value: 'purple', bg: '#e9d5ff', fold: '#a855f7', text: '#581c87', shadow: 'rgba(168, 85, 247, 0.3)' },
  { value: 'orange', bg: '#fed7aa', fold: '#f97316', text: '#7c2d12', shadow: 'rgba(249, 115, 22, 0.3)' },
];

const getColorStyles = (color: StickyNoteColor) => {
  return NOTE_COLORS.find((c) => c.value === color) || NOTE_COLORS[0];
};

export default function StickyNotesWidget() {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState<StickyNoteColor>('yellow');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToStickyNotes(currentUser.uid, setNotes);
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (isCreating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingNoteId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length
      );
    }
  }, [editingNoteId]);

  const handleCreateNote = async () => {
    if (!currentUser || !newNoteContent.trim()) return;

    try {
      await createStickyNote(currentUser.uid, newNoteContent.trim(), newNoteColor);
      setNewNoteContent('');
      setNewNoteColor('yellow');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) {
      await handleDeleteNote(noteId);
      return;
    }

    try {
      await updateStickyNote(noteId, { content: editContent.trim() });
      setEditingNoteId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteStickyNote(noteId);
      setEditingNoteId(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleChangeColor = async (noteId: string, color: StickyNoteColor) => {
    try {
      await updateStickyNote(noteId, { color });
      setShowColorPicker(null);
    } catch (error) {
      console.error('Failed to change color:', error);
    }
  };

  const startEditing = (note: StickyNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setShowColorPicker(null);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  // Empty state
  if (notes.length === 0 && !isCreating) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-yellow-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm mb-2">No notes yet</p>
        <button
          onClick={() => setIsCreating(true)}
          className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors"
        >
          Create your first note
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsCreating(true)}
          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          title="Add note"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Notes Grid - single column for bigger notes */}
      <div className="space-y-3">
        {/* Create New Note Form */}
        {isCreating && (() => {
          const colors = getColorStyles(newNoteColor);
          return (
            <div
              className="relative rounded-sm p-4 shadow-lg"
              style={{
                backgroundColor: colors.bg,
                boxShadow: `4px 4px 12px ${colors.shadow}, 0 2px 4px rgba(0,0,0,0.1)`,
                minHeight: '120px',
              }}
            >
              {/* Folded corner */}
              <div
                className="absolute top-0 right-0 w-0 h-0"
                style={{
                  borderStyle: 'solid',
                  borderWidth: '0 20px 20px 0',
                  borderColor: `transparent ${colors.fold} transparent transparent`,
                }}
              />
              <div
                className="absolute top-0 right-0 w-5 h-5"
                style={{
                  background: `linear-gradient(135deg, ${colors.bg} 50%, transparent 50%)`,
                }}
              />
              <textarea
                ref={textareaRef}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value.slice(0, 280))}
                placeholder="Write your note..."
                className="w-full bg-transparent text-sm placeholder-black/40 resize-none focus:outline-none pr-6 font-medium"
                style={{ color: colors.text }}
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) handleCreateNote();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewNoteContent('');
                  }
                }}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/10">
                <div className="flex gap-1.5">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewNoteColor(color.value)}
                      className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                        newNoteColor === color.value ? 'ring-2 ring-offset-1 ring-black/30' : ''
                      }`}
                      style={{ backgroundColor: color.bg }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewNoteContent('');
                    }}
                    className="px-3 py-1 text-xs font-medium opacity-70 hover:opacity-100 rounded"
                    style={{ color: colors.text }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim()}
                    className="px-4 py-1 text-xs font-bold rounded shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: newNoteContent.trim() ? colors.fold : '#9ca3af',
                      color: 'white',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Existing Notes */}
        {notes.slice(0, isCreating ? 1 : 2).map((note, index) => {
          const colors = getColorStyles(note.color);
          const isEditing = editingNoteId === note.id;
          // Slight rotation for organic feel
          const rotations = [-0.5, 0.5];
          const rotation = rotations[index % rotations.length];

          return (
            <div
              key={note.id}
              className="relative rounded-sm p-4 group transition-transform hover:scale-[1.01] hover:z-10"
              style={{
                backgroundColor: colors.bg,
                boxShadow: `4px 4px 12px ${colors.shadow}, 0 2px 4px rgba(0,0,0,0.1)`,
                transform: `rotate(${rotation}deg)`,
                minHeight: '100px',
              }}
            >
              {/* Folded corner */}
              <div
                className="absolute top-0 right-0 w-0 h-0"
                style={{
                  borderStyle: 'solid',
                  borderWidth: '0 20px 20px 0',
                  borderColor: `transparent ${colors.fold} transparent transparent`,
                }}
              />
              <div
                className="absolute top-0 right-0 w-5 h-5"
                style={{
                  background: `linear-gradient(135deg, ${colors.bg} 50%, transparent 50%)`,
                }}
              />

              {isEditing ? (
                <>
                  <textarea
                    ref={editTextareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value.slice(0, 280))}
                    className="w-full bg-transparent text-sm resize-none focus:outline-none pr-6 font-medium"
                    style={{ color: colors.text }}
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleUpdateNote(note.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/10">
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-60 hover:opacity-100 p-1"
                      style={{ color: '#dc2626' }}
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-xs font-medium opacity-70 hover:opacity-100 rounded"
                        style={{ color: colors.text }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateNote(note.id)}
                        className="px-4 py-1 text-xs font-bold rounded shadow-md hover:shadow-lg transition-all"
                        style={{ backgroundColor: colors.fold, color: 'white' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p
                    className="text-sm whitespace-pre-wrap break-words cursor-pointer pr-6 font-medium leading-relaxed"
                    style={{ color: colors.text }}
                    onClick={() => startEditing(note)}
                  >
                    {note.content}
                  </p>
                  {/* Color picker button - appears on hover in top left to avoid corner */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowColorPicker(showColorPicker === note.id ? null : note.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-md"
                      style={{ backgroundColor: colors.fold, color: 'white' }}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {showColorPicker === note.id && (
                    <div
                      className="absolute top-10 left-2 rounded-lg p-2 shadow-xl z-10 flex gap-1.5"
                      style={{ backgroundColor: 'rgba(30, 30, 30, 0.95)' }}
                    >
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => handleChangeColor(note.id, color.value)}
                          className={`w-5 h-5 rounded-full hover:scale-110 transition-all ${
                            note.color === color.value ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''
                          }`}
                          style={{ backgroundColor: color.bg }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {notes.length > 4 && (
        <p className="text-center text-gray-500 text-xs mt-2">+{notes.length - 4} more</p>
      )}
    </div>
  );
}
