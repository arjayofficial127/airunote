'use client';
import { useEffect, useRef, type TextareaHTMLAttributes } from 'react';
export function GrowingField({ value, limit = 2000, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & { value: string; limit?: number }) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = field.current; if (!element) return;
    const resize = () => { element.style.height = '0px'; element.style.height = Math.min(element.scrollHeight, limit) + 'px'; element.style.overflowY = element.scrollHeight > limit ? 'auto' : 'hidden'; };
    resize(); const observer = new ResizeObserver(resize); if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [value, limit]);
  useEffect(() => { if (props.autoFocus && !props.disabled) field.current?.focus(); }, [props.autoFocus, props.disabled]);
  return <textarea {...props} ref={field} rows={1} value={value}/>;
}
