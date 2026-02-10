import { DashboardEditor } from '@/components/DashboardEditor';

export default function DashboardPage({ params }: { params: { id: string } }) {
  return <DashboardEditor dashboardId={params.id} />;
}
