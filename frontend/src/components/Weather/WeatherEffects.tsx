// frontend/src/components/Weather/WeatherEffects.tsx
import { useEffect, useState } from 'react';

interface WeatherEffectsProps {
  weatherMain: string;
  isVisible?: boolean; // Добавляем пропс для контроля видимости
}

export const WeatherEffects = ({ weatherMain, isVisible = true }: WeatherEffectsProps) => {
  const [effects, setEffects] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (!isVisible) {
      setEffects([]);
      return;
    }

    if (weatherMain === 'Clear') {
      setEffects([
        <div
          key="sun-glow"
          className="absolute top-5 right-5 w-48 h-48 bg-yellow-400/30 rounded-full blur-3xl animate-pulse"
          style={{ zIndex: 1 }}
        />,
        <div
          key="sun-core"
          className="absolute top-10 right-10 w-24 h-24 bg-yellow-300/40 rounded-full blur-2xl animate-ping"
          style={{ zIndex: 1 }}
        />,
      ]);
    }
    else if (weatherMain === 'Clouds') {
      setEffects([
          <div
          key="cloud1"
          className="absolute w-80 h-40 bg-white/40 rounded-full blur-3xl animate-float-slow"
          style={{ top: '5%', left: '-80px', zIndex: 1 }}
          />,
          <div
          key="cloud2"
          className="absolute w-96 h-48 bg-white/30 rounded-full blur-3xl animate-float-medium"
          style={{ bottom: '20%', right: '-100px', zIndex: 1 }}
          />,
          <div
          key="cloud3"
          className="absolute w-72 h-36 bg-white/35 rounded-full blur-3xl animate-float-fast"
          style={{ top: '40%', left: '10%', zIndex: 1 }}
          />,
          <div
          key="cloud4"
          className="absolute w-64 h-32 bg-white/25 rounded-full blur-3xl animate-float-slow"
          style={{ top: '70%', right: '15%', zIndex: 1 }}
          />,
          <div
          key="cloud5"
          className="absolute w-56 h-28 bg-white/30 rounded-full blur-3xl animate-float-medium"
          style={{ top: '25%', right: '30%', zIndex: 1 }}
          />,
          <div
          key="cloud6"
          className="absolute w-84 h-44 bg-white/30 rounded-full blur-3x1 animate-float-fast"
          style={{ bottom: '55%', left: '30%', zIndex: 1 }}
          />,
      ]);
    }
    else if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
      const drops = [];
      for (let i = 0; i < 70; i++) {
        drops.push(
          <div
            key={i}
            className="absolute text-blue-300/60 text-base animate-rain"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-30px',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${0.7 + Math.random() * 0.6}s`,
              zIndex: 1,
            }}
          >
            💧
          </div>
        );
      }
      setEffects(drops);
    }
    else if (weatherMain === 'Snow') {
      const flakes = [];
      for (let i = 0; i < 60; i++) {
        flakes.push(
          <div
            key={i}
            className="absolute text-white/70 text-base animate-snow"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-30px',
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              zIndex: 1,
            }}
          >
            ❄️
          </div>
        );
      }
      setEffects(flakes);
    }
    else if (weatherMain === 'Thunderstorm') {
      const stormEffects = [];
      for (let i = 0; i < 70; i++) {
        stormEffects.push(
          <div
            key={`rain-${i}`}
            className="absolute text-blue-300/60 text-base animate-rain"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-30px',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${0.7 + Math.random() * 0.6}s`,
              zIndex: 1,
            }}
          >
            💧
          </div>
        );
      }
      stormEffects.push(
        <div
          key="flash"
          className="absolute inset-0 bg-white/40 pointer-events-none animate-flash-random"
          style={{ zIndex: 2 }}
        />
      );
      setEffects(stormEffects);
    }
    else {
      setEffects([]);
    }
  }, [weatherMain, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {effects}
    </div>
  );
};

