'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useExamSounds() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('airunote_exam_sounds');
    if (saved !== null) setSoundEnabled(saved !== 'off');
    return () => { void contextRef.current?.close(); };
  }, []);

  const audioContext = useCallback(() => {
    if (!contextRef.current) contextRef.current = new AudioContext();
    if (contextRef.current.state === 'suspended') void contextRef.current.resume();
    return contextRef.current;
  }, []);

  const primeSound = useCallback(() => {
    if (soundEnabled) audioContext();
  }, [audioContext, soundEnabled]);

  const playNext = useCallback(() => {
    if (!soundEnabled) return;
    const context = audioContext();
    const now = context.currentTime;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.065, now + index * 0.075 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.075 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.075);
      oscillator.stop(now + index * 0.075 + 0.18);
    });
  }, [audioContext, soundEnabled]);

  const playCelebration = useCallback(() => {
    if (!soundEnabled) return;
    const context = audioContext();
    const now = context.currentTime;
    for (let clap = 0; clap < 9; clap += 1) {
      const length = Math.floor(context.sampleRate * 0.075);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = 1250 + Math.random() * 650;
      filter.Q.value = 0.7;
      gain.gain.value = 0.055 + Math.random() * 0.035;
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start(now + clap * 0.095 + Math.random() * 0.025);
    }
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.045, now + index * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.38);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.4);
    });
  }, [audioContext, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      window.localStorage.setItem('airunote_exam_sounds', next ? 'on' : 'off');
      if (next) audioContext();
      return next;
    });
  }, [audioContext]);

  return { soundEnabled, toggleSound, primeSound, playNext, playCelebration };
}
