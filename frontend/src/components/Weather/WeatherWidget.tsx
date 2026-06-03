import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  feels_like: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
}

// Маппинг кодов OpenWeather на твои имена файлов
const getIconFileName = (iconCode: string): string => {
  const mapping: Record<string, string> = {
    '01d': 'sun',
    '01n': 'sun',      // если есть moon.svg, замени на 'moon'
    '02d': 'cloud_less',
    '02n': 'cloud_less',
    '03d': 'cloud_many',
    '03n': 'cloud_many',
    '04d': 'cloud_many',
    '04n': 'cloud_many',
    '09d': 'rain',
    '09n': 'rain',
    '10d': 'rain',
    '10n': 'rain',
    '11d': 'lightning',
    '11n': 'lightning',
    '13d': 'snow',
    '13n': 'snow',
    '50d': 'fog',
    '50n': 'fog',
  };
  return mapping[iconCode] || 'sun';
};

// Запасные эмодзи на случай, если иконка не загрузилась
const getFallbackEmoji = (iconCode: string): string => {
  if (iconCode.includes('01')) return '☀️';
  if (iconCode.includes('02')) return '⛅';
  if (iconCode.includes('03') || iconCode.includes('04')) return '☁️';
  if (iconCode.includes('09') || iconCode.includes('10')) return '🌧️';
  if (iconCode.includes('11')) return '⛈️';
  if (iconCode.includes('13')) return '❄️';
  if (iconCode.includes('50')) return '🌫️';
  return '🌡️';
};

export const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);

  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const LAT = import.meta.env.VITE_WEATHER_LAT;
  const LON = import.meta.env.VITE_WEATHER_LON;

  useEffect(() => {
    if (!API_KEY || !LAT || !LON) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        const response = await fetch(`/ow/weather?lat=${LAT}&lon=${LON}&units=metric&lang=ru&appid=${API_KEY}`);
        
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        
        setWeather({
          temp: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          humidity: data.main.humidity,
          wind_speed: Math.round(data.wind.speed),
        });
        setLoading(false);
      } catch (err) {
        console.error('Ошибка погоды:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [API_KEY, LAT, LON]);

  if (loading) {
    return (
      <div className="bg-slate-800/90 rounded-2xl px-5 py-3 shadow-xl border border-slate-600">
        <div className="text-white text-xl">🌡️ --°C</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-slate-800/90 rounded-2xl px-5 py-3 shadow-xl border border-slate-600">
        <div className="text-white/60 text-xl">🌡️ --°C</div>
      </div>
    );
  }

  const iconFileName = getIconFileName(weather.icon);
  const iconPath = `/weather-icons/${iconFileName}.svg`;

  return (
    <div className="bg-slate-800/90 rounded-2xl px-5 py-3 shadow-xl border border-slate-600">
      <div className="flex items-center gap-4">
        {/* Иконка погоды */}
        <div className="flex-shrink-0">
          {!imgError ? (
            <img 
              src={iconPath}
              alt={weather.description}
              className="w-16 h-16 drop-shadow-lg"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="text-6xl">{getFallbackEmoji(weather.icon)}</div>
          )}
        </div>
        
        <div>
          <div className="text-5xl font-black text-white">{weather.temp}°</div>
          <div className="text-sm text-slate-300 capitalize">{weather.description}</div>
          <div className="flex gap-3 mt-2 text-xs text-white/70">
            <span>💧 {weather.humidity}%</span>
            <span>🌬️ {weather.wind_speed} м/с</span>
            <span>🌡️ {weather.feels_like}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
