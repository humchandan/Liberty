'use client';

import { useState, useEffect } from 'react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeRemaining(maturityDate: Date): TimeRemaining {
  const now = new Date();
  const difference = maturityDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function CountdownTimer({ maturityDate }: { maturityDate: string | Date }) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0 
  });

  useEffect(() => {
    const targetDate = typeof maturityDate === 'string' ? new Date(maturityDate) : maturityDate;
    
    // Update immediately
    setTimeRemaining(calculateTimeRemaining(targetDate));
    
    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [maturityDate]);

  return (
    <div className="flex gap-4">
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{timeRemaining.days}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Days</div>
      </div>
      <div className="text-3xl font-bold text-gray-400">:</div>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{timeRemaining.hours}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Hours</div>
      </div>
      <div className="text-3xl font-bold text-gray-400">:</div>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{timeRemaining.minutes}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Minutes</div>
      </div>
      <div className="text-3xl font-bold text-gray-400">:</div>
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-600">{timeRemaining.seconds}</div>
        <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Seconds</div>
      </div>
    </div>
  );
}
