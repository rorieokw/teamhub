import { useState, useEffect, useRef } from 'react';
import {
  searchGifs,
  getTrendingGifs,
  GIF_CATEGORIES,
  type TenorGif,
} from '../../services/tenor';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trending GIFs on mount
  useEffect(() => {
    loadTrendingGifs();
    inputRef.current?.focus();
  }, []);

  async function loadTrendingGifs() {
    setLoading(true);
    const results = await getTrendingGifs(30);
    setGifs(results);
    setLoading(false);
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    setActiveCategory('');

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      loadTrendingGifs();
      setActiveCategory('Trending');
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchGifs(query, 30);
      setGifs(results);
      setLoading(false);
    }, 300);
  }

  async function handleCategoryClick(category: { name: string; query: string }) {
    setActiveCategory(category.name);
    setSearchQuery('');
    setLoading(true);

    if (category.query === '') {
      await loadTrendingGifs();
    } else {
      const results = await searchGifs(category.query, 30);
      setGifs(results);
    }
    setLoading(false);
  }

  function handleGifSelect(gif: TenorGif) {
    onSelect(gif.url);
    onClose();
  }

  return (
    <div className="absolute bottom-full right-0 mb-2 w-96 max-w-[calc(100vw-2rem)] glass rounded-xl shadow-2xl z-50 animate-scale-in overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/10 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-thin">
          {GIF_CATEGORIES.map((category) => (
            <button
              key={category.name}
              onClick={() => handleCategoryClick(category)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                activeCategory === category.name
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* GIF Grid */}
      <div className="h-72 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm mt-2">Loading GIFs...</p>
            </div>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400">No GIFs found</p>
              <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleGifSelect(gif)}
                className="relative group rounded-lg overflow-hidden bg-white/5 hover:ring-2 hover:ring-purple-500 transition-all"
                style={{ aspectRatio: `${gif.width}/${gif.height}`, maxHeight: '150px' }}
              >
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-500">Powered by Tenor</span>
        <svg className="w-12 h-4 text-gray-500" viewBox="0 0 100 24" fill="currentColor">
          <text x="0" y="18" fontSize="16" fontWeight="bold">TENOR</text>
        </svg>
      </div>
    </div>
  );
}
