import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  feels_like: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
}

export const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const formatDescription = (text: string) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl border border-white/20">
        <div className="text-white/80 text-xl animate-pulse">🌡️ --°C</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl border border-white/20">
        <div className="text-white/60 text-xl">🌡️ --°C</div>
      </div>
    );
  }

  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl border border-white/25 transition-all duration-300 hover:bg-black/50">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img 
            src={iconUrl}
            alt={weather.description}
            className="w-16 h-16 drop-shadow-lg"
            loading="lazy"
          />
        </div>
        
        <div>
          <div className="text-5xl font-black text-white drop-shadow-md">{weather.temp}°</div>
          <div className="text-sm text-white/90">
            {formatDescription(weather.description)}
          </div>
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
