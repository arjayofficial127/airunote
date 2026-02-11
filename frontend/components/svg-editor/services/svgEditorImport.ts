/**
 * SVG Editor Import Service
 * Functions for importing SVG strings into SvgEditorData format
 */

import type { SvgEditorElement, SvgEditorLayer, SvgEditorData } from '../types/svgEditor.types';

/**
 * Parse SVG string into SvgEditorData
 * Supports: rect, circle, ellipse, line, path, polygon, text
 */
export function importFromSvg(svgString: string, defaultWidth: number = 800, defaultHeight: number = 600): SvgEditorData {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;

  // Get SVG dimensions
  const width = parseFloat(svgElement.getAttribute('width') || String(defaultWidth));
  const height = parseFloat(svgElement.getAttribute('height') || String(defaultHeight));
  const viewBox = svgElement.getAttribute('viewBox');

  // Create default layer
  const defaultLayer: SvgEditorLayer = {
    id: 'layer-1',
    name: 'Layer 1',
    visible: true,
    locked: false,
    opacity: 1,
  };

  const layers: SvgEditorLayer[] = [defaultLayer];
  const elements: SvgEditorElement[] = [];

  // Parse all child elements
  const childNodes = Array.from(svgElement.childNodes);
  let elementIndex = 0;

  childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;

    // Skip defs, style, script, etc.
    if (['defs', 'style', 'script', 'metadata'].includes(element.tagName.toLowerCase())) {
      return;
    }

    const elementId = `imported-${elementIndex++}`;
    const baseElement: Partial<SvgEditorElement> = {
      id: elementId,
      type: element.tagName.toLowerCase() as SvgEditorElement['type'],
      layerId: defaultLayer.id,
      fill: element.getAttribute('fill') || 'none',
      stroke: element.getAttribute('stroke') || 'none',
      strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1'),
      opacity: parseFloat(element.getAttribute('opacity') || '1'),
      transform: element.getAttribute('transform') || undefined,
    };

    switch (element.tagName.toLowerCase()) {
      case 'rect': {
        elements.push({
          ...baseElement,
          type: 'rect',
          x: parseFloat(element.getAttribute('x') || '0'),
          y: parseFloat(element.getAttribute('y') || '0'),
          width: parseFloat(element.getAttribute('width') || '0'),
          height: parseFloat(element.getAttribute('height') || '0'),
        } as SvgEditorElement);
        break;
      }
      case 'circle': {
        elements.push({
          ...baseElement,
          type: 'circle',
          cx: parseFloat(element.getAttribute('cx') || '0'),
          cy: parseFloat(element.getAttribute('cy') || '0'),
          r: parseFloat(element.getAttribute('r') || '0'),
        } as SvgEditorElement);
        break;
      }
      case 'ellipse': {
        elements.push({
          ...baseElement,
          type: 'ellipse',
          cx: parseFloat(element.getAttribute('cx') || '0'),
          cy: parseFloat(element.getAttribute('cy') || '0'),
          rx: parseFloat(element.getAttribute('rx') || '0'),
          ry: parseFloat(element.getAttribute('ry') || '0'),
        } as SvgEditorElement);
        break;
      }
      case 'line': {
        elements.push({
          ...baseElement,
          type: 'line',
          x1: parseFloat(element.getAttribute('x1') || '0'),
          y1: parseFloat(element.getAttribute('y1') || '0'),
          x2: parseFloat(element.getAttribute('x2') || '0'),
          y2: parseFloat(element.getAttribute('y2') || '0'),
        } as SvgEditorElement);
        break;
      }
      case 'path': {
        elements.push({
          ...baseElement,
          type: 'path',
          d: element.getAttribute('d') || '',
        } as SvgEditorElement);
        break;
      }
      case 'polygon': {
        elements.push({
          ...baseElement,
          type: 'polygon',
          points: element.getAttribute('points') || '',
        } as SvgEditorElement);
        break;
      }
      case 'polyline': {
        // Convert polyline to polygon (close the path)
        const points = element.getAttribute('points') || '';
        elements.push({
          ...baseElement,
          type: 'polygon',
          points: points,
        } as SvgEditorElement);
        break;
      }
      case 'text': {
        const textContent = element.textContent || '';
        elements.push({
          ...baseElement,
          type: 'text',
          x: parseFloat(element.getAttribute('x') || '0'),
          y: parseFloat(element.getAttribute('y') || '0'),
          text: textContent,
          fontSize: parseFloat(element.getAttribute('font-size') || '16'),
          fontFamily: element.getAttribute('font-family') || 'Arial',
        } as SvgEditorElement);
        break;
      }
    }
  });

  return {
    width,
    height,
    elements,
    layers,
  };
}
