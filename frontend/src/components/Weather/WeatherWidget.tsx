import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  feels_like: number;
  description: string;
  iconCode: string;
  humidity: number;
  wind_speed: number;
}

const getWeatherIconPath = (iconCode: string): string => {
  const iconMap: { [key: string]: string } = {
    // Ясно
    '01d': '/assets/weather/sun.svg',       // ясно день
    '01n': '/assets/weather/moon.svg',      // ясно ночь
    
    // Малооблачно
    '02d': '/assets/weather/cloud-sun.svg', // малооблачно день
    '02n': '/assets/weather/cloud-moon.svg',// малооблачно ночь
    
    // Облачно
    '03d': '/assets/weather/cloud.svg',     // облачно день
    '03n': '/assets/weather/cloud.svg',     // облачно ночь
    
    // Пасмурно
    '04d': '/assets/weather/cloud.svg',     // пасмурно день (используем cloud.svg)
    '04n': '/assets/weather/cloud.svg',     // пасмурно ночь
    
    // Ливень
    '09d': '/assets/weather/rain.svg',      // ливень день
    '09n': '/assets/weather/rain.svg',      // ливень ночь
    
    // Дождь
    '10d': '/assets/weather/rain-sun.svg',  // дождь день
    '10n': '/assets/weather/rain-moon.svg', // дождь ночь
    
    // Гроза
    '11d': '/assets/weather/thunder.svg',   // гроза день
    '11n': '/assets/weather/thunder.svg',   // гроза ночь
    
    // Снег
    '13d': '/assets/weather/snow.svg',      // снег день
    '13n': '/assets/weather/snow.svg',      // снег ночь
    
    // Туман
    '50d': '/assets/weather/cloud.svg',     // туман день (заменяем на облако, т.к. fog.svg нет)
    '50n': '/assets/weather/cloud.svg',     // туман ночь
  };

  return iconMap[iconCode] || '/assets/weather/default.svg';
};

// Форматирование описания погоды
const formatDescription = (text: string) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

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
          iconCode: data.weather[0].icon,
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

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl border border-white/25 transition-all duration-300 hover:bg-black/50">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img 
            src={getWeatherIconPath(weather.iconCode)}
            alt={weather.description}
            className="w-16 h-16 drop-shadow-lg"
            loading="lazy"
            onError={(e) => {
              // Если иконка не загрузилась, показываем эмодзи
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const emoji = document.createElement('span');
                emoji.className = 'text-5xl';
                emoji.textContent = '🌡️';
                parent.appendChild(emoji);
              }
            }}
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
