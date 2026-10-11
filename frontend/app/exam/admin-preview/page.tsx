import { AdminExamPreview } from '@/components/exams/AdminExamPreview';

export default function AdminPreviewRoute({ searchParams }: { searchParams: { org?: string; exam?: string } }) {
  return <AdminExamPreview orgId={searchParams.org || ''} examId={searchParams.exam || ''} />;
}
