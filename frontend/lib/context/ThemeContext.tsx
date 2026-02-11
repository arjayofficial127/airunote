'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface Theme {
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontHeading?: string;
  fontBody?: string;
  borderRadius?: string;
}

const defaultTheme: Theme = {
  primaryColor: '#2563eb', // blue-600
  secondaryColor: '#64748b', // slate-500
  backgroundColor: '#ffffff',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  borderRadius: '0.5rem',
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ theme, children }: { theme?: Theme; children: ReactNode }) {
  const mergedTheme = { ...defaultTheme, ...theme };
  return <ThemeContext.Provider value={mergedTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

