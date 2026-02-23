import { fetchDashboardData } from "@/lib/api";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let data;
  try {
    data = await fetchDashboardData();
  } catch (error) {
    console.error("Dashboard server-side fetch failed:", error);
    // Return a graceful error UI instead of crashing the build
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-foreground p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Backend Connection Failed</h1>
        <p className="text-muted-foreground mb-4">
          Cannot connect to the Yantage backend API.
        </p>
        <p className="text-sm border border-red-500/20 bg-red-500/10 text-red-500 px-4 py-3 rounded-lg max-w-md">
          Ensure your FastAPI server is running on <code className="font-mono">127.0.0.1:8000</code> or set <code className="font-mono">INTERNAL_API_URL</code> correctly.
        </p>
      </div>
    );
  }

  return <DashboardClient data={data} />;
}
