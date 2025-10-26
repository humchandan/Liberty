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
    
    setTimeRemaining(calculateTimeRemaining(targetDate));
    
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [maturityDate]);

  return (
    <div className="flex gap-1.5 xs:gap-2 sm:gap-4 justify-center items-center text-center">
      <div className="flex flex-col items-center min-w-10 xs:min-w-[3rem] sm:min-w-16">
        <div className="text-base xs:text-xl sm:text-3xl font-bold leading-tight">{timeRemaining.days}</div>
        <div className="text-[8px] xs:text-[10px] sm:text-xs text-gray-600 uppercase mt-0.5">DAYS</div>
      </div>
      <div className="text-base xs:text-xl sm:text-3xl font-bold text-gray-400 leading-none">:</div>
      <div className="flex flex-col items-center min-w-10 xs:min-w-[3rem] sm:min-w-16">
        <div className="text-base xs:text-xl sm:text-3xl font-bold leading-tight">{timeRemaining.hours}</div>
        <div className="text-[8px] xs:text-[10px] sm:text-xs text-gray-600 uppercase mt-0.5">HOURS</div>
      </div>
      <div className="text-base xs:text-xl sm:text-3xl font-bold text-gray-400 leading-none">:</div>
      <div className="flex flex-col items-center min-w-10 xs:min-w-[3rem] sm:min-w-16">
        <div className="text-base xs:text-xl sm:text-3xl font-bold leading-tight">{timeRemaining.minutes}</div>
        <div className="text-[8px] xs:text-[10px] sm:text-xs text-gray-600 uppercase mt-0.5">MINS</div>
      </div>
      <div className="text-base xs:text-xl sm:text-3xl font-bold text-gray-400 leading-none">:</div>
      <div className="flex flex-col items-center min-w-10 xs:min-w-[3rem] sm:min-w-16">
        <div className="text-base xs:text-xl sm:text-3xl font-bold text-blue-600 leading-tight">{timeRemaining.seconds}</div>
        <div className="text-[8px] xs:text-[10px] sm:text-xs text-gray-600 uppercase mt-0.5">SECS</div>
      </div>
    </div>
  );
}
