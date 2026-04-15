import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getSharedAudio, getStoredVolume, setStoredVolume } from '../utils/streamAudio';

/**
 * Volume control for the shared stream player (gradient range + mute).
 */
export default function StreamVolumeBar({ className = '' }) {
  const [level, setLevel] = useState(getStoredVolume);
  const [muted, setMuted] = useState(false);
  const beforeMute = useRef(level);

  useEffect(() => {
    const a = getSharedAudio();
    if (!a) return;
    if (muted) {
      a.volume = 0;
    } else {
      a.volume = setStoredVolume(level);
    }
  }, [level, muted]);

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      setLevel(beforeMute.current > 0 ? beforeMute.current : 0.85);
    } else {
      beforeMute.current = level;
      setMuted(true);
    }
  };

  const displayLevel = muted ? 0 : level;

  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${className}`}
      data-testid="stream-volume-bar"
    >
      <button
        type="button"
        onClick={toggleMute}
        className="w-9 h-9 rounded-full bg-white/5 border border-[rgba(255,255,255,0.12)] flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
        aria-label={muted || displayLevel === 0 ? 'Unmute' : 'Mute'}
      >
        {muted || displayLevel === 0 ? (
          <VolumeX size={16} className="text-[#a1a1aa]" />
        ) : (
          <Volume2 size={16} className="text-[#00F0FF]" />
        )}
      </button>
      <div className="flex-1 min-w-[100px] max-w-[200px] h-9 flex items-center px-2 rounded-full bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.1)]">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={displayLevel}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            setMuted(false);
            setLevel(next);
            beforeMute.current = next;
          }}
          className="stream-vol-slider w-full h-2 cursor-pointer"
          aria-label="Stream volume"
        />
      </div>
    </div>
  );
}
