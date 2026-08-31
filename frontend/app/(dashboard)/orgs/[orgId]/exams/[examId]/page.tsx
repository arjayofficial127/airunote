import { ExamBuilder } from '@/components/exams/ExamBuilder';

interface ExamBuilderPageProps {
  params: { examId: string };
}

export default function ExamBuilderPage({ params }: ExamBuilderPageProps) {
  return <ExamBuilder examId={params.examId} />;
}
