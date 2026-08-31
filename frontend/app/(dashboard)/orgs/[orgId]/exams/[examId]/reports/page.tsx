import { ExamReports } from '@/components/exams/ExamReports';

interface ExamReportsPageProps { params: { examId: string } }

export default function ExamReportsPage({ params }: ExamReportsPageProps) {
  return <ExamReports examId={params.examId} />;
}
