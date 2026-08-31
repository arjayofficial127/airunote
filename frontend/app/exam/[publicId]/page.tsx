import { PublicExamPage } from '@/components/exams/PublicExamPage';

interface PublicExamRouteProps { params: { publicId: string } }

export default function PublicExamRoute({ params }: PublicExamRouteProps) {
  return <PublicExamPage publicId={params.publicId} />;
}
