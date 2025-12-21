import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent, ChangeEvent, DragEvent } from 'react';
import GifPicker from './GifPicker';
import PollCreator from '../polls/PollCreator';
import { parsePollCommand, createPoll } from '../../services/polls';
import { useAuth } from '../../contexts/AuthContext';
import { uploadChatImages, validateImageFile } from '../../services/storage';

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => Promise<void>;
  onPollCreated?: (pollId: string) => void;
  channelId: string;
  projectId?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface ImagePreview {
  file: File;
  url: string;
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
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, []);

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const newPreviews: ImagePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);

      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        continue;
      }

      // Limit to 4 images total
      if (imagePreviews.length + newPreviews.length >= 4) {
        setUploadError('Maximum 4 images per message');
        break;
      }

      newPreviews.push({
        file,
        url: URL.createObjectURL(file),
      });
    }

    setImagePreviews([...imagePreviews, ...newPreviews]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    const preview = imagePreviews[index];
    URL.revokeObjectURL(preview.url);
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const newPreviews: ImagePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const validation = validateImageFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        continue;
      }

      if (imagePreviews.length + newPreviews.length >= 4) {
        setUploadError('Maximum 4 images per message');
        break;
      }

      newPreviews.push({
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (newPreviews.length > 0) {
      setImagePreviews([...imagePreviews, ...newPreviews]);
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();

    const trimmed = content.trim();
    const hasImages = imagePreviews.length > 0;

    if ((!trimmed && !hasImages) || sending || disabled) return;

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
      let imageUrls: string[] | undefined;

      // Upload images if any
      if (hasImages && currentUser) {
        const files = imagePreviews.map(p => p.file);
        imageUrls = await uploadChatImages(files, currentUser.uid, channelId);
      }

      await onSend(trimmed, imageUrls);

      // Clear form
      setContent('');
      imagePreviews.forEach(p => URL.revokeObjectURL(p.url));
      setImagePreviews([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setUploadError('Failed to send message. Please try again.');
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
    <form
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="p-4 glass-dark border-t border-white/10 relative"
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-500/20 border-2 border-dashed border-purple-500 rounded-lg z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <svg className="w-12 h-12 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-purple-300 font-medium">Drop images here</p>
          </div>
        </div>
      )}

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

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="mb-3 flex gap-2 flex-wrap">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview.url}
                alt={`Preview ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-white/20"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{uploadError}</p>
        </div>
      )}

      <div className="flex gap-3 items-end">
        {/* Image upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-colors"
          title="Upload images"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

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
            placeholder={imagePreviews.length > 0 ? 'Add a caption (optional)...' : placeholder}
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
          disabled={(!content.trim() && imagePreviews.length === 0) || sending || disabled}
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
      <p className="text-xs text-gray-600 mt-2 ml-24">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
