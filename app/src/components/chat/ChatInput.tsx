import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import GifPicker from './GifPicker';
import PollCreator from '../polls/PollCreator';
import { parsePollCommand, createPoll } from '../../services/polls';
import { useAuth } from '../../contexts/AuthContext';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  onPollCreated?: (pollId: string) => void;
  channelId: string;
  projectId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  onPollCreated,
  channelId,
  projectId,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const { currentUser, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showPollHint, setShowPollHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect /poll command
  useEffect(() => {
    setShowPollHint(content.trim().startsWith('/poll'));
  }, [content]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [content]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || sending || disabled) return;

    // Check for /poll command
    const pollData = parsePollCommand(trimmed);
    if (pollData && currentUser && userProfile) {
      setSending(true);
      try {
        const pollId = await createPoll(
          channelId,
          pollData.question,
          pollData.options,
          currentUser.uid,
          userProfile.displayName,
          projectId
        );
        setContent('');
        onPollCreated?.(pollId);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (err) {
        console.error('Failed to create poll:', err);
      } finally {
        setSending(false);
      }
      return;
    }

    // Check for incomplete /poll command - show creator instead
    if (trimmed === '/poll') {
      setShowPollCreator(true);
      setContent('');
      return;
    }

    setSending(true);
    try {
      await onSend(trimmed);
      setContent('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleGifSelect(gifUrl: string) {
    if (sending || disabled) return;

    setSending(true);
    try {
      await onSend(gifUrl);
    } catch (err) {
      console.error('Failed to send GIF:', err);
    } finally {
      setSending(false);
    }
  }

  // Poll creator modal
  if (showPollCreator) {
    return (
      <div className="p-4 glass-dark border-t border-white/10">
        <PollCreator
          channelId={channelId}
          projectId={projectId}
          onClose={() => setShowPollCreator(false)}
          onSuccess={(pollId) => {
            onPollCreated?.(pollId);
            setShowPollCreator(false);
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 glass-dark border-t border-white/10">
      {/* Poll hint */}
      {showPollHint && (
        <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg animate-fade-in">
          <p className="text-sm text-purple-300">
            <span className="font-medium">Poll syntax:</span>{' '}
            <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs">
              /poll "Question?" "Option 1" "Option 2"
            </code>
          </p>
          <p className="text-xs text-white/50 mt-1">
            Or just type <code className="px-1 py-0.5 bg-white/10 rounded">/poll</code> and press Enter to open the poll creator
          </p>
        </div>
      )}

      <div className="flex gap-3 items-end">
        {/* Poll button */}
        <button
          type="button"
          onClick={() => setShowPollCreator(true)}
          className="p-2.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors"
          title="Create a poll"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h4v8H3zM10 9h4v12h-4zM17 5h4v16h-4z" />
          </svg>
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none disabled:opacity-50 transition-all"
          />
        </div>

        {/* Emoji button */}
        <button
          type="button"
          className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* GIF button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGifPicker(!showGifPicker)}
            className={`p-2.5 rounded-xl transition-colors ${
              showGifPicker
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Send a GIF"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5c0 .28-.22.5-.5.5H7.5v1h1c.28 0 .5.22.5.5v.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5H9c.28 0 .5.22.5.5v.5c0 .28-.22.5-.5.5H7.5v1H9c.28 0 .5.22.5.5v.5zm3.5 2.5h-1c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h1c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5zm5-2h-1v1.5c0 .28-.22.5-.5.5H16c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h2.5c.28 0 .5.22.5.5v.5c0 .28-.22.5-.5.5H17v1h1.5c.28 0 .5.22.5.5v.5c0 .28-.22.5-.5.5z" />
            </svg>
          </button>

          {showGifPicker && (
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!content.trim() || sending || disabled}
          className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-purple-500/25 disabled:shadow-none"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2 ml-12">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
