'use client';

import { useEffect, useState, type RefObject } from 'react';

export type PhoneScreen = 'today' | 'folders' | 'inbox' | 'view' | 'editor' | 'search' | 'more';
const screens = ['today', 'folders', 'inbox', 'view', 'editor', 'search', 'more'];
const initial = { screen: 'today' as PhoneScreen, back: 'today' as PhoneScreen, full: false };

function read(key: string): typeof initial {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (value && screens.includes(value.screen) && screens.includes(value.back)) {
      return { screen: value.screen, back: value.back === 'editor' ? 'today' : value.back, full: value.full === true };
    }
  } catch { /* Workspace navigation works without storage. */ }
  return initial;
}

export function usePhoneWorkspace(key: string, container: RefObject<HTMLDivElement>) {
  const [narrow, setNarrow] = useState(false);
  const [navigation, setNavigation] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const measure = () => setNarrow(media.matches);
    measure();
    media.addEventListener('change', measure);
    setNavigation(read(key));
    setLoaded(true);
    return () => media.removeEventListener('change', measure);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try { sessionStorage.setItem(key, JSON.stringify(navigation)); } catch { /* Optional on this device. */ }
  }, [key, loaded, navigation]);

  const phone = narrow && !navigation.full;
  useEffect(() => {
    if (!phone) return;
    const shell = container.current?.closest<HTMLElement>('.workspace-focus-shell');
    const viewport = window.visualViewport;
    if (!shell || !viewport) return;
    const measure = () => {
      if (viewport.scale === 1) shell.style.setProperty('--an-phone-height', `${viewport.height}px`);
    };
    measure();
    viewport.addEventListener('resize', measure);
    return () => {
      viewport.removeEventListener('resize', measure);
      shell.style.removeProperty('--an-phone-height');
    };
  }, [container, phone]);

  function show(screen: PhoneScreen) {
    setNavigation(previous => previous.screen === screen ? previous : {
      ...previous,
      screen,
      back: screen === 'editor' ? previous.screen : previous.back,
    });
  }

  return {
    phone,
    narrow,
    screen: navigation.screen,
    previousScreen: navigation.back,
    back: () => show(navigation.back),
    show,
    setFull: (full: boolean) => setNavigation(previous => ({ ...previous, full })),
  };
}
