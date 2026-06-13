import { useEffect, useState } from 'react';

interface WeatherEffectsProps {
  weatherMain: string;
  isVisible?: boolean;
}

export const WeatherEffects = ({ weatherMain, isVisible = true }: WeatherEffectsProps) => {
  const [effects, setEffects] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!isVisible) {
      setEffects([]);
      return;
    }

    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 20;

    // Солнце или луна
    if (weatherMain === 'Clear') {
      if (isNight) {
        // Луна (серебристо-серая для ночи)
        setEffects([
          <div
            key="moon"
            className="absolute rounded-full blur-xl moon-pulse"
            style={{ 
              top: '15%',
              right: '5%',
              width: '120px',
              height: '120px',
              zIndex: 1,
              background: 'radial-gradient(circle, rgba(200,210,220,0.7), rgba(150,160,170,0.4))',
              boxShadow: '0 0 40px rgba(180,190,200,0.4)',
            }}
          />,
        ]);
      } else {
        // Солнце
        setEffects([
          <div
            key="sun"
            className="absolute rounded-full blur-xl sun-pulse"
            style={{ 
              top: '15%',
              right: '5%',
              width: '140px',
              height: '140px',
              zIndex: 1,
              background: 'radial-gradient(circle, rgba(255,220,80,0.9), rgba(255,120,50,0.5))',
              boxShadow: '0 0 50px rgba(255,200,50,0.5)',
            }}
          />,
        ]);
      }
    }
    // Облака
    else if (weatherMain === 'Clouds') {
      const clouds = [
        { top: '5%', left: '-20%', width: '220px', height: '110px', className: 'animate-float-slow' },
        { top: '15%', left: '15%', width: '300px', height: '150px', className: 'animate-float-medium' },
        { top: '35%', left: '-10%', width: '260px', height: '130px', className: 'animate-float-fast' },
        { top: '50%', left: '25%', width: '320px', height: '160px', className: 'animate-float-slow' },
        { top: '65%', left: '-20%', width: '240px', height: '120px', className: 'animate-float-medium' },
        { top: '80%', left: '5%', width: '280px', height: '140px', className: 'animate-float-fast' },
        { top: '10%', left: '55%', width: '270px', height: '135px', className: 'animate-float-slow' },
        { top: '28%', left: '70%', width: '230px', height: '115px', className: 'animate-float-medium' },
        { top: '48%', left: '80%', width: '310px', height: '155px', className: 'animate-float-fast' },
        { top: '75%', left: '60%', width: '250px', height: '125px', className: 'animate-float-slow' },
      ];
      
      setEffects(
        clouds.map((cloud, i) => (
          <div
            key={`cloud-${i}`}
            className={`absolute bg-white/30 rounded-full blur-3xl ${cloud.className}`}
            style={{
              top: cloud.top,
              left: cloud.left,
              width: cloud.width,
              height: cloud.height,
              zIndex: 1,
            }}
          />
        ))
      );
    }
    // Дождь
    else if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
      const drops = [];
      for (let i = 0; i < 100; i++) {
        drops.push(
          <div
            key={`rain-${i}`}
            className="absolute text-blue-300/60 text-base animate-rain"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-20 - Math.random() * 30}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${0.5 + Math.random() * 0.6}s`,
              zIndex: 1,
            }}
          >
            💧
          </div>
        );
      }
      setEffects(drops);
    }
    // Снег
    else if (weatherMain === 'Snow') {
      const flakes = [];
      for (let i = 0; i < 80; i++) {
        flakes.push(
          <div
            key={`snow-${i}`}
            className="absolute text-white/70 text-base animate-snow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-20 - Math.random() * 30}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              zIndex: 1,
            }}
          >
            ❄️
          </div>
        );
      }
      setEffects(flakes);
    }
    // Гроза
    else if (weatherMain === 'Thunderstorm') {
      const storm = [];
      for (let i = 0; i < 80; i++) {
        storm.push(
          <div
            key={`storm-rain-${i}`}
            className="absolute text-blue-300/60 text-base animate-rain"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-20 - Math.random() * 30}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${0.5 + Math.random() * 0.6}s`,
              zIndex: 1,
            }}
          >
            💧
          </div>
        );
      }
      storm.push(
        <div
          key="lightning"
          className="absolute inset-0 bg-white/30 pointer-events-none animate-flash-random"
          style={{ zIndex: 2 }}
        />
      );
      setEffects(storm);
    }
    // Туман
    else if (weatherMain === 'Fog') {
      setEffects([
        <div
          key="fog-1"
          className="absolute inset-0 bg-white/20 backdrop-blur-[3px] fog-effect"
          style={{ zIndex: 1 }}
        />,
        <div
          key="fog-2"
          className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent fog-effect"
          style={{ zIndex: 1, animationDelay: '0.5s' }}
        />,
      ]);
    } else {
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
