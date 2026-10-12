import { notFound } from 'next/navigation';
import { LocalAdminSandbox } from '@/components/exams/LocalAdminSandbox';
export default function LocalAdminPage() { if(process.env.NODE_ENV !== 'development')notFound();return <LocalAdminSandbox/>; }
