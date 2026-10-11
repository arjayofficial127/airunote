import { CodedExamPreview } from '@/components/exams/CodedExamPreview';
export default function CodedPreviewRoute({ searchParams }: { searchParams: { exam?: string } }) {
  return <CodedExamPreview publicId={searchParams.exam || ''} />;
}
