import { useState, useEffect, useRef } from 'react';

interface WeatherData {
  temp: string;
  icon: string;
  location: string;
}

export default function StatusBar() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Lo-fi radio streams
  const tracks = [
    { name: 'Chill Beats', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
    { name: 'Lo-Fi Radio', url: 'https://streams.ilovemusic.de/iloveradio21.mp3' },
    { name: 'Relaxing Mix', url: 'https://stream.laut.fm/lofi' },
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather on mount
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('https://wttr.in/?format=j1');
        const data = await response.json();
        const current = data.current_condition[0];
        const area = data.nearest_area[0];

        setWeather({
          temp: current.temp_C,
          icon: getWeatherIcon(current.weatherCode),
          location: area.areaName[0].value,
        });
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        setWeather({ temp: '--', icon: '🌤️', location: '' });
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, []);

  const getWeatherIcon = (code: string): string => {
    const codeNum = parseInt(code);
    if (codeNum === 113) return '☀️';
    if (codeNum === 116) return '⛅';
    if (codeNum === 119 || codeNum === 122) return '☁️';
    if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 311, 314, 317, 353, 356, 359].includes(codeNum)) return '🌧️';
    if ([179, 182, 185, 227, 230, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(codeNum)) return '🌨️';
    if ([200, 386, 389, 392, 395].includes(codeNum)) return '⛈️';
    return '🌤️';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
    setIsPlaying(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  return (
    <div className="h-10 bg-black/20 border-b border-white/5 flex items-center justify-between px-4 md:px-6">
      {/* Time & Date */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white font-medium">{formatTime(time)}</span>
        <span className="text-gray-500 hidden sm:inline">•</span>
        <span className="text-gray-400 hidden sm:inline">{formatDate(time)}</span>
      </div>

      {/* Music Player - Center */}
      <div className="flex items-center gap-2">
        <audio
          ref={audioRef}
          src={tracks[currentTrack].url}
          onEnded={nextTrack}
        />

        {/* Previous */}
        <button
          onClick={prevTrack}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors ${
            isPlaying ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-600 hover:bg-gray-500'
          }`}
        >
          {isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={nextTrack}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        {/* Track Name */}
        <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
          {tracks[currentTrack].name}
        </span>
      </div>

      {/* Weather - Right */}
      {weather && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 hidden sm:inline">{weather.location}</span>
          <span className="text-white font-medium">{weather.temp}°C</span>
          <span className="text-base">{weather.icon}</span>
        </div>
      )}
    </div>
  );
}
