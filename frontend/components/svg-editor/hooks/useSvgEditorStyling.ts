/**
 * SVG Editor Styling State Hook
 * Manages fill, stroke, gradients, and effects state
 */

import { useState } from 'react';
import type { GradientStop } from '../types/svgEditor.types';

export interface UseSvgEditorStylingReturn {
  // Basic styling
  fillColor: string;
  setFillColor: (color: string) => void;
  fillEnabled: boolean;
  setFillEnabled: (enabled: boolean) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeEnabled: boolean;
  setStrokeEnabled: (enabled: boolean) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  
  // Advanced stroke
  strokeDasharray: string;
  setStrokeDasharray: (dash: string) => void;
  strokeLinecap: 'butt' | 'round' | 'square';
  setStrokeLinecap: (cap: 'butt' | 'round' | 'square') => void;
  strokeLinejoin: 'miter' | 'round' | 'bevel';
  setStrokeLinejoin: (join: 'miter' | 'round' | 'bevel') => void;
  
  // Gradients
  showGradientEditor: boolean;
  setShowGradientEditor: (show: boolean) => void;
  currentGradient: 'fill' | 'stroke' | null;
  setCurrentGradient: (gradient: 'fill' | 'stroke' | null) => void;
  gradientType: 'linear' | 'radial';
  setGradientType: (type: 'linear' | 'radial') => void;
  gradientStops: GradientStop[];
  setGradientStops: React.Dispatch<React.SetStateAction<GradientStop[]>>;
  
  // Effects
  shadowEnabled: boolean;
  setShadowEnabled: (enabled: boolean) => void;
  shadowOffsetX: number;
  setShadowOffsetX: (x: number) => void;
  shadowOffsetY: number;
  setShadowOffsetY: (y: number) => void;
  shadowBlur: number;
  setShadowBlur: (blur: number) => void;
  shadowColor: string;
  setShadowColor: (color: string) => void;
  blurEnabled: boolean;
  setBlurEnabled: (enabled: boolean) => void;
  blurRadius: number;
  setBlurRadius: (radius: number) => void;
  blendMode: string;
  setBlendMode: (mode: string) => void;
}

export function useSvgEditorStyling(): UseSvgEditorStylingReturn {
  const [fillColor, setFillColor] = useState('#000000');
  const [fillEnabled, setFillEnabled] = useState(true);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  
  const [strokeDasharray, setStrokeDasharray] = useState<string>('');
  const [strokeLinecap, setStrokeLinecap] = useState<'butt' | 'round' | 'square'>('butt');
  const [strokeLinejoin, setStrokeLinejoin] = useState<'miter' | 'round' | 'bevel'>('miter');
  
  const [showGradientEditor, setShowGradientEditor] = useState(false);
  const [currentGradient, setCurrentGradient] = useState<'fill' | 'stroke' | null>(null);
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientStops, setGradientStops] = useState<GradientStop[]>([
    { offset: 0, color: '#000000' },
    { offset: 100, color: '#ffffff' }
  ]);
  
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowOffsetX, setShadowOffsetX] = useState(2);
  const [shadowOffsetY, setShadowOffsetY] = useState(2);
  const [shadowBlur, setShadowBlur] = useState(4);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [blurRadius, setBlurRadius] = useState(2);
  const [blendMode, setBlendMode] = useState<string>('normal');

  return {
    fillColor,
    setFillColor,
    fillEnabled,
    setFillEnabled,
    strokeColor,
    setStrokeColor,
    strokeEnabled,
    setStrokeEnabled,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    strokeDasharray,
    setStrokeDasharray,
    strokeLinecap,
    setStrokeLinecap,
    strokeLinejoin,
    setStrokeLinejoin,
    showGradientEditor,
    setShowGradientEditor,
    currentGradient,
    setCurrentGradient,
    gradientType,
    setGradientType,
    gradientStops,
    setGradientStops,
    shadowEnabled,
    setShadowEnabled,
    shadowOffsetX,
    setShadowOffsetX,
    shadowOffsetY,
    setShadowOffsetY,
    shadowBlur,
    setShadowBlur,
    shadowColor,
    setShadowColor,
    blurEnabled,
    setBlurEnabled,
    blurRadius,
    setBlurRadius,
    blendMode,
    setBlendMode,
  };
}
