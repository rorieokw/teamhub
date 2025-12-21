import { useState } from 'react';
import type { FormEvent } from 'react';
import { addDocumentLink, detectFileType } from '../../services/documents';

interface DocumentLinkFormProps {
  projectId: string;
  userId: string;
  onSuccess?: () => void;
}

export default function DocumentLinkForm({
  projectId,
  userId,
  onSuccess,
}: DocumentLinkFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name for the document');
      return;
    }

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const fileType = detectFileType(url);
      await addDocumentLink(projectId, name.trim(), url.trim(), fileType, userId);
      setName('');
      setUrl('');
      onSuccess?.();
    } catch (err) {
      console.error('Failed to add document link:', err);
      setError('Failed to add document. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Document Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Project Roadmap"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Link URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/document/d/..."
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Supports Google Drive, Docs, Sheets, Slides, Dropbox, OneDrive, Notion, Figma, GitHub
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
      >
        {loading ? 'Adding...' : 'Add Document Link'}
      </button>
    </form>
  );
}
