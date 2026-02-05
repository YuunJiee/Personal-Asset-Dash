import { fetchDashboardData } from "@/lib/api";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let data;
  try {
    data = await fetchDashboardData();
  } catch (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Error loading dashboard data. Refer to backend console.
      </div>
    );
  }

  return <DashboardClient data={data} />;
}
