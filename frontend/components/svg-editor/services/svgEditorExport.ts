/**
 * SVG Editor Export Service
 * Functions for exporting SVG editor content to various formats
 */

import type { SvgEditorElement, SvgEditorLayer, SvgEditorData } from '../types/svgEditor.types';
import { getElementBoundingBox } from './svgEditorUtils';

/**
 * Export editor data to SVG string
 * Includes gradients, advanced stroke styles, filters, and blend modes
 */
export function exportToSvg(
  data: SvgEditorData,
  elements: SvgEditorElement[],
  layers: SvgEditorLayer[]
): string {
  const visibleElements = elements.filter(el => {
    const layer = layers.find(l => l.id === el.layerId);
    return layer?.visible;
  });

  // Calculate bounding box of all visible elements for free canvas
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  visibleElements.forEach(el => {
    const bbox = getElementBoundingBox(el);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }
  });

  // If no elements, use default dimensions; otherwise use calculated bounds with padding
  const padding = 20;
  const exportWidth = visibleElements.length > 0 ? maxX - minX + padding * 2 : data.width;
  const exportHeight = visibleElements.length > 0 ? maxY - minY + padding * 2 : data.height;
  const exportViewBox = visibleElements.length > 0 
    ? `${minX - padding} ${minY - padding} ${exportWidth} ${exportHeight}`
    : `0 0 ${data.width} ${data.height}`;

  // PHASE 3: Collect gradients and filters for defs section
  const gradientDefs: string[] = [];
  const filterDefs: string[] = [];

  const svgElements = visibleElements.map((el, index) => {
    const layer = layers.find(l => l.id === el.layerId);
    const opacity = (el.opacity || 1) * (layer?.opacity || 1);
    const stableId = `elem-${index}`;
    
    // PHASE 3: Handle gradients
    let fillValue = el.fill || 'none';
    if (el.fillGradient) {
      const gradientId = `grad-${stableId}-fill`;
      fillValue = `url(#${gradientId})`;
      const bbox = getElementBoundingBox(el);
      if (bbox) {
        if (el.fillGradient.type === 'linear') {
          gradientDefs.push(
            `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${el.fillGradient.stops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')}</linearGradient>`
          );
        } else {
          gradientDefs.push(
            `<radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%">${el.fillGradient.stops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')}</radialGradient>`
          );
        }
      }
    }
    
    let strokeValue = el.stroke || 'none';
    if (el.strokeGradient) {
      const gradientId = `grad-${stableId}-stroke`;
      strokeValue = `url(#${gradientId})`;
      const bbox = getElementBoundingBox(el);
      if (bbox) {
        if (el.strokeGradient.type === 'linear') {
          gradientDefs.push(
            `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${el.strokeGradient.stops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')}</linearGradient>`
          );
        } else {
          gradientDefs.push(
            `<radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%">${el.strokeGradient.stops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')}</radialGradient>`
          );
        }
      }
    }
    
    // PHASE 3: Handle filters (shadows, blur)
    let filterValue = '';
    if (el.filter) {
      const filterId = `filter-${stableId}`;
      filterValue = `filter="url(#${filterId})"`;
      // Parse filter string to create SVG filter
      const shadowMatch = el.filter.match(/drop-shadow\(([^)]+)\)/);
      const blurMatch = el.filter.match(/blur\(([^)]+)\)/);
      if (shadowMatch || blurMatch) {
        let filterContent = '';
        if (shadowMatch) {
          const parts = shadowMatch[1].split(/\s+/);
          const offsetX = parts[0] || '2';
          const offsetY = parts[1] || '2';
          const blur = parts[2] || '4';
          const color = parts[3] || '#000000';
          filterContent += `<feGaussianBlur in="SourceAlpha" stdDeviation="${Number(blur) / 2}"/><feOffset dx="${offsetX}" dy="${offsetY}" result="offsetblur"/><feFlood flood-color="${color}" flood-opacity="0.5"/><feComposite in2="offsetblur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>`;
        }
        if (blurMatch && !shadowMatch) {
          const blur = blurMatch[1].replace('px', '');
          filterContent = `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}"/>`;
        }
        filterDefs.push(`<filter id="${filterId}">${filterContent}</filter>`);
      }
    }
    
    // Build attributes array (only include non-default values)
    const attrs: string[] = [`id="${stableId}"`];
    
    // PHASE 3: Add blend mode if not normal
    if (el.mixBlendMode && el.mixBlendMode !== 'normal') {
      attrs.push(`style="mix-blend-mode: ${el.mixBlendMode}"`);
    }
    
    switch (el.type) {
      case 'rect':
        if (el.x !== undefined) attrs.push(`x="${el.x}"`);
        if (el.y !== undefined) attrs.push(`y="${el.y}"`);
        if (el.width) attrs.push(`width="${el.width}"`);
        if (el.height) attrs.push(`height="${el.height}"`);
        attrs.push(`fill="${fillValue}"`);
        if (strokeValue !== 'none') attrs.push(`stroke="${strokeValue}"`);
        if (el.strokeWidth && el.strokeWidth !== 0) attrs.push(`stroke-width="${el.strokeWidth}"`);
        if (el.strokeDasharray) attrs.push(`stroke-dasharray="${el.strokeDasharray}"`);
        if (el.strokeLinecap && el.strokeLinecap !== 'butt') attrs.push(`stroke-linecap="${el.strokeLinecap}"`);
        if (el.strokeLinejoin && el.strokeLinejoin !== 'miter') attrs.push(`stroke-linejoin="${el.strokeLinejoin}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        if (filterValue) attrs.push(filterValue);
        return `<rect ${attrs.join(' ')} />`;
      case 'circle':
        if (el.cx !== undefined) attrs.push(`cx="${el.cx}"`);
        if (el.cy !== undefined) attrs.push(`cy="${el.cy}"`);
        if (el.r) attrs.push(`r="${el.r}"`);
        attrs.push(`fill="${fillValue}"`);
        if (strokeValue !== 'none') attrs.push(`stroke="${strokeValue}"`);
        if (el.strokeWidth && el.strokeWidth !== 0) attrs.push(`stroke-width="${el.strokeWidth}"`);
        if (el.strokeDasharray) attrs.push(`stroke-dasharray="${el.strokeDasharray}"`);
        if (el.strokeLinecap && el.strokeLinecap !== 'butt') attrs.push(`stroke-linecap="${el.strokeLinecap}"`);
        if (el.strokeLinejoin && el.strokeLinejoin !== 'miter') attrs.push(`stroke-linejoin="${el.strokeLinejoin}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        if (filterValue) attrs.push(filterValue);
        return `<circle ${attrs.join(' ')} />`;
      case 'ellipse':
        if (el.cx !== undefined) attrs.push(`cx="${el.cx}"`);
        if (el.cy !== undefined) attrs.push(`cy="${el.cy}"`);
        if (el.rx) attrs.push(`rx="${el.rx}"`);
        if (el.ry) attrs.push(`ry="${el.ry}"`);
        attrs.push(`fill="${fillValue}"`);
        if (strokeValue !== 'none') attrs.push(`stroke="${strokeValue}"`);
        if (el.strokeWidth && el.strokeWidth !== 0) attrs.push(`stroke-width="${el.strokeWidth}"`);
        if (el.strokeDasharray) attrs.push(`stroke-dasharray="${el.strokeDasharray}"`);
        if (el.strokeLinecap && el.strokeLinecap !== 'butt') attrs.push(`stroke-linecap="${el.strokeLinecap}"`);
        if (el.strokeLinejoin && el.strokeLinejoin !== 'miter') attrs.push(`stroke-linejoin="${el.strokeLinejoin}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        if (filterValue) attrs.push(filterValue);
        return `<ellipse ${attrs.join(' ')} />`;
      case 'line':
        if (el.x1 !== undefined) attrs.push(`x1="${el.x1}"`);
        if (el.y1 !== undefined) attrs.push(`y1="${el.y1}"`);
        if (el.x2 !== undefined) attrs.push(`x2="${el.x2}"`);
        if (el.y2 !== undefined) attrs.push(`y2="${el.y2}"`);
        if (strokeValue !== 'none') attrs.push(`stroke="${strokeValue}"`);
        if (el.strokeWidth && el.strokeWidth !== 2) attrs.push(`stroke-width="${el.strokeWidth}"`);
        if (el.strokeDasharray) attrs.push(`stroke-dasharray="${el.strokeDasharray}"`);
        if (el.strokeLinecap && el.strokeLinecap !== 'butt') attrs.push(`stroke-linecap="${el.strokeLinecap}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        if (filterValue) attrs.push(filterValue);
        return `<line ${attrs.join(' ')} />`;
      case 'polygon':
        if (el.points) attrs.push(`points="${el.points}"`);
        attrs.push(`fill="${fillValue}"`);
        if (strokeValue !== 'none') attrs.push(`stroke="${strokeValue}"`);
        if (el.strokeWidth && el.strokeWidth !== 0) attrs.push(`stroke-width="${el.strokeWidth}"`);
        if (el.strokeDasharray) attrs.push(`stroke-dasharray="${el.strokeDasharray}"`);
        if (el.strokeLinecap && el.strokeLinecap !== 'butt') attrs.push(`stroke-linecap="${el.strokeLinecap}"`);
        if (el.strokeLinejoin && el.strokeLinejoin !== 'miter') attrs.push(`stroke-linejoin="${el.strokeLinejoin}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        if (filterValue) attrs.push(filterValue);
        return `<polygon ${attrs.join(' ')} />`;
      case 'path':
        if (el.d) attrs.push(`d="${el.d}"`);
        attrs.push(`fill="${fillValue}"`);
        if (strokeValue !== 'none') attrs.push(`stroke="${strokeValue}"`);
        if (el.strokeWidth && el.strokeWidth !== 2) attrs.push(`stroke-width="${el.strokeWidth}"`);
        if (el.strokeDasharray) attrs.push(`stroke-dasharray="${el.strokeDasharray}"`);
        if (el.strokeLinecap && el.strokeLinecap !== 'butt') attrs.push(`stroke-linecap="${el.strokeLinecap}"`);
        if (el.strokeLinejoin && el.strokeLinejoin !== 'miter') attrs.push(`stroke-linejoin="${el.strokeLinejoin}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        if (filterValue) attrs.push(filterValue);
        return `<path ${attrs.join(' ')} />`;
      case 'text':
        if (el.x !== undefined) attrs.push(`x="${el.x}"`);
        if (el.y !== undefined) attrs.push(`y="${el.y}"`);
        if (el.fontSize && el.fontSize !== 16) attrs.push(`font-size="${el.fontSize}"`);
        if (el.fontFamily && el.fontFamily !== 'Arial') attrs.push(`font-family="${el.fontFamily}"`);
        if (el.fill) attrs.push(`fill="${el.fill}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        return `<text ${attrs.join(' ')}>${el.text || ''}</text>`;
      case 'image':
        if (el.x !== undefined) attrs.push(`x="${el.x}"`);
        if (el.y !== undefined) attrs.push(`y="${el.y}"`);
        if (el.width) attrs.push(`width="${el.width}"`);
        if (el.height) attrs.push(`height="${el.height}"`);
        if (el.imageUrl) attrs.push(`href="${el.imageUrl}"`);
        if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
        if (el.transform) attrs.push(`transform="${el.transform}"`);
        return `<image ${attrs.join(' ')} />`;
      default:
        return '';
    }
  }).join('\n    ');

  // PHASE 3: Build defs section with gradients and filters
  const defsSection = gradientDefs.length > 0 || filterDefs.length > 0
    ? `  <defs>\n    ${[...gradientDefs, ...filterDefs].join('\n    ')}\n  </defs>`
    : '';

  return `<svg width="${exportWidth}" height="${exportHeight}" viewBox="${exportViewBox}" xmlns="http://www.w3.org/2000/svg">
${defsSection}
    ${svgElements}
</svg>`;
}

/**
 * Export editor data to PNG image
 * @param data - Editor data
 * @param elements - All elements
 * @param layers - All layers
 * @param scale - Scale factor (1, 2, or 4)
 * @returns Promise that resolves to blob URL
 */
export async function exportToImage(
  data: SvgEditorData,
  elements: SvgEditorElement[],
  layers: SvgEditorLayer[],
  scale: number = 1
): Promise<string> {
  // Get SVG string
  const svgString = exportToSvg(data, elements, layers);
  
  // Parse SVG to get dimensions
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  
  const width = parseFloat(svgElement.getAttribute('width') || '800');
  const height = parseFloat(svgElement.getAttribute('height') || '600');
  const viewBox = svgElement.getAttribute('viewBox');
  
  // Calculate canvas dimensions
  const canvasWidth = width * scale;
  const canvasHeight = height * scale;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Create image from SVG
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Draw SVG to canvas at scale
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      URL.revokeObjectURL(url);
      
      // Convert to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          resolve(blobUrl);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };
    
    img.src = url;
  });
}
