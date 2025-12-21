import { formatFileSize, getFileIcon } from '../../services/documents';
import type { Document, User } from '../../types';

interface DocumentCardProps {
  document: Document;
  uploader?: User;
  canDelete?: boolean;
  onDelete?: () => void;
}

export default function DocumentCard({
  document,
  uploader,
  canDelete = false,
  onDelete,
}: DocumentCardProps) {
  const formatDate = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  function handleDownload() {
    window.open(document.fileUrl, '_blank');
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">
          {getFileIcon(document.fileType)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate" title={document.name}>
            {document.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>•</span>
            <span>{formatDate(document.createdAt)}</span>
          </div>
          {uploader && (
            <p className="text-xs text-gray-500 mt-1">
              Uploaded by {uploader.displayName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
