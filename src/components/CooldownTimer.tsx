import { useState, useEffect } from 'react';

interface CooldownTimerProps {
  cooldownEndTime: number;
}

// A helper function to format the time
const formatTime = (milliseconds: number) => {
    if (milliseconds < 0) return '00:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const CooldownTimer = ({ cooldownEndTime }: CooldownTimerProps) => {
  const [remainingTime, setRemainingTime] = useState(cooldownEndTime - Date.now());

  useEffect(() => {
    // Set up an interval to update the countdown every second
    const intervalId = setInterval(() => {
      const timeLeft = cooldownEndTime - Date.now();
      setRemainingTime(timeLeft);
      // Stop the interval if the time is up
      if (timeLeft < 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    // Clean up the interval when the component is removed
    return () => clearInterval(intervalId);
  }, [cooldownEndTime]);

  return (
    <span className="text-xs text-red-400 font-mono">
      {remainingTime > 0 ? formatTime(remainingTime) : 'Ready'}
    </span>
  );
};