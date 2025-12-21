import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createPoll } from '../../services/polls';

interface PollCreatorProps {
  channelId: string;
  projectId?: string;
  onClose: () => void;
  onSuccess?: (pollId: string) => void;
}

export default function PollCreator({ channelId, projectId, onClose, onSuccess }: PollCreatorProps) {
  const { currentUser, userProfile } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!trimmedQuestion || trimmedOptions.length < 2) return;

    setIsSubmitting(true);
    try {
      const pollId = await createPoll(
        channelId,
        trimmedQuestion,
        trimmedOptions,
        currentUser.uid,
        userProfile.displayName,
        projectId
      );
      onSuccess?.(pollId);
      onClose();
    } catch (error) {
      console.error('Failed to create poll:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validOptions = options.filter((o) => o.trim().length > 0);
  const canSubmit = question.trim().length > 0 && validOptions.length >= 2;

  return (
    <div className="glass-card rounded-xl p-4 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm">
            📊
          </div>
          <h3 className="font-medium text-white/90">Create Poll</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-white/50">Options</label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-sm"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {options.length < 6 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors w-full"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add option
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </button>
        </div>
      </form>

      <p className="mt-3 text-xs text-white/40 text-center">
        Tip: You can also type <code className="px-1 py-0.5 bg-white/10 rounded">/poll "Question" "Option 1" "Option 2"</code>
      </p>
    </div>
  );
}
