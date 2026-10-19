import { notFound } from 'next/navigation';
import { LocalBookSandbox } from '@/components/book/LocalBookSandbox';
export default function LocalBookPage() { if (process.env.NODE_ENV !== 'development') notFound(); return <LocalBookSandbox />; }
