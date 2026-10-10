import { notFound } from 'next/navigation';
import { LocalAppearanceWorkspace } from '@/components/exams/LocalAppearanceWorkspace';

export default function LocalAppearancePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <LocalAppearanceWorkspace />;
}
