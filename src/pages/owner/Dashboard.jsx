import DailyUsage from '../../components/owner/DailyUsage';
import LowStockAlert from '../../components/owner/LowStockAlert';
import ActivityFeed from '../../components/owner/ActivityFeed';
import MonthlyExpense from '../../components/owner/MonthlyExpense';

export default function Dashboard() {
  return (
    <div className="min-h-screen pb-safe pt-6 md:px-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Owner dashboard</p>
          <h1 className="text-3xl font-bold text-text">Inventory insights</h1>
          <p className="text-sm text-text-muted max-w-2xl">
            Monitor stock levels, usage, spending, and employee activity in real time.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <MonthlyExpense />
          <LowStockAlert />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DailyUsage />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
