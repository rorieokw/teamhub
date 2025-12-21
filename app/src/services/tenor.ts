// Tenor GIF API Service
// Free API - https://tenor.com/gifapi/documentation

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Free public API key
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

export interface TenorGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
  size: number;
}

interface TenorResult {
  id: string;
  title: string;
  media_formats: {
    gif: TenorMediaFormat;
    tinygif: TenorMediaFormat;
    nanogif: TenorMediaFormat;
    mediumgif?: TenorMediaFormat;
  };
}

interface TenorResponse {
  results: TenorResult[];
  next: string;
}

function mapTenorResult(result: TenorResult): TenorGif {
  const gif = result.media_formats.gif || result.media_formats.mediumgif;
  const preview = result.media_formats.tinygif || result.media_formats.nanogif;

  return {
    id: result.id,
    title: result.title,
    url: gif.url,
    previewUrl: preview.url,
    width: gif.dims[0],
    height: gif.dims[1],
  };
}

// Search for GIFs
export async function searchGifs(query: string, limit: number = 20): Promise<TenorGif[]> {
  try {
    const params = new URLSearchParams({
      key: TENOR_API_KEY,
      q: query,
      limit: limit.toString(),
      media_filter: 'gif,tinygif',
      contentfilter: 'medium',
    });

    const response = await fetch(`${TENOR_BASE_URL}/search?${params}`);

    if (!response.ok) {
      throw new Error('Failed to search GIFs');
    }

    const data: TenorResponse = await response.json();
    return data.results.map(mapTenorResult);
  } catch (error) {
    console.error('Error searching GIFs:', error);
    return [];
  }
}

// Get trending/featured GIFs
export async function getTrendingGifs(limit: number = 20): Promise<TenorGif[]> {
  try {
    const params = new URLSearchParams({
      key: TENOR_API_KEY,
      limit: limit.toString(),
      media_filter: 'gif,tinygif',
      contentfilter: 'medium',
    });

    const response = await fetch(`${TENOR_BASE_URL}/featured?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch trending GIFs');
    }

    const data: TenorResponse = await response.json();
    return data.results.map(mapTenorResult);
  } catch (error) {
    console.error('Error fetching trending GIFs:', error);
    return [];
  }
}

// Get GIFs by category
export async function getGifsByCategory(category: string, limit: number = 20): Promise<TenorGif[]> {
  return searchGifs(category, limit);
}

// Popular categories for quick access
export const GIF_CATEGORIES = [
  { name: 'Trending', query: '' },
  { name: 'Reactions', query: 'reactions' },
  { name: 'Love', query: 'love' },
  { name: 'Happy', query: 'happy' },
  { name: 'Sad', query: 'sad' },
  { name: 'Angry', query: 'angry' },
  { name: 'Laugh', query: 'laughing' },
  { name: 'Dance', query: 'dance' },
  { name: 'Celebrate', query: 'celebrate' },
  { name: 'Thumbs Up', query: 'thumbs up' },
  { name: 'Facepalm', query: 'facepalm' },
  { name: 'Mind Blown', query: 'mind blown' },
];

// Check if a URL is a GIF
export function isGifUrl(url: string): boolean {
  return url.includes('tenor.com') ||
         url.includes('giphy.com') ||
         url.endsWith('.gif');
}

// Extract GIF URL from message content
export function extractGifUrl(content: string): string | null {
  const gifPattern = /(https?:\/\/[^\s]+\.gif|https?:\/\/media\.tenor\.com[^\s]+|https?:\/\/[^\s]*giphy[^\s]+)/i;
  const match = content.match(gifPattern);
  return match ? match[0] : null;
}
