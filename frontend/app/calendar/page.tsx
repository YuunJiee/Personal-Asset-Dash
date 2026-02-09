'use client';

import { useState, useEffect } from "react";
import { fetchDashboardData } from "@/lib/api";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Helper to get day of week for start of month
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function FinancialCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { isPrivacyMode } = usePrivacy();
  const { t, language } = useLanguage();

  // Fetch data
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchDashboardData();
        // Flatten transactions from ALL assets
        const allTxns = data.assets.flatMap((asset: any) => {
          // Filter: Exclude assets that are NOT included in Net Worth
          // Debugging exclusion
          if (asset.include_in_net_worth === false) {
            return [];
          }

          return (asset.transactions || []).map((t: any) => ({
            ...t,
            assetName: asset.name,
            ticker: asset.ticker,
            category: asset.category,
            currentAssetPrice: asset.current_price,
            parsedDate: new Date(t.date)
          }));
        });
        setTransactions(allTxns);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Get transactions for a specific day
  const getTxnsForMonth = () => {
    return transactions.filter(t =>
      t.parsedDate.getFullYear() === year && t.parsedDate.getMonth() === month
    );
  };

  const getTxnsForDay = (day: number) => {
    return transactions.filter(t =>
      t.parsedDate.getFullYear() === year && t.parsedDate.getMonth() === month && t.parsedDate.getDate() === day
    );
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  // Calculate Monthly Metrics
  const monthlyTxns = getTxnsForMonth();

  // Helper to calculate transaction value
  // Helper to calculate transaction value (Price * Amount)
  const getTxnValue = (t: any) => {
    let price = t.buy_price;
    if (!price || price === 0) {
      // Fallback to current asset price, or 1 if that fails (e.g. Cash)
      price = (t.currentAssetPrice && t.currentAssetPrice > 0) ? t.currentAssetPrice : 1;
    }
    return Math.abs(t.amount) * price;
  };

  // Determine if a transaction is effectively an "Inflow" (Money IN / Wealth UP)
  // For standard assets: Amount > 0 (Buy/Deposit)
  // For Liabilities: Amount < 0 (Repayment/Debt Down) -> Wealth UP (technically transfer, but let's count as Inflow/Positive action for now?
  // User asked for "Total Outflow" to include Credit Card spending.
  // Credit Card Spending = Amount > 0 (Debt UP).
  // So for Liabilities: Amount > 0 -> Outflow.
  const isInflow = (t: any) => {
    if (t.category === 'Liabilities') {
      return t.amount < 0; // Debt going down is "Good" (Inflow-like) or Repayment
    }
    return t.amount > 0; // Asset going up
  };

  const isOutflow = (t: any) => {
    if (t.category === 'Liabilities') {
      return t.amount > 0; // Debt going up is "Bad" (Outflow/Expense)
    }
    return t.amount < 0; // Asset going down
  };

  const monthlyInflow = monthlyTxns
    .filter(t => isInflow(t))
    .reduce((sum, t) => sum + getTxnValue(t), 0);

  const monthlyOutflow = monthlyTxns
    .filter(t => isOutflow(t))
    .reduce((sum, t) => sum + getTxnValue(t), 0);

  const monthlyNetFlow = monthlyInflow - monthlyOutflow;

  const getActionLabel = (t: any) => {
    if (t.amount > 0) {
      if (t.category === 'Investment') return 'BUY';
      if (t.category === 'Fluid') return 'INC';
      if (t.category === 'Liabilities') return 'BORROW';
      return 'ADD';
    } else {
      if (t.category === 'Investment') return 'SELL';
      if (t.category === 'Fluid') return 'EXP';
      if (t.category === 'Liabilities') return 'REPAY';
      return 'DEC';
    }
  };

  // Helper for localized month/day names
  const getMonthName = (date: Date) => {
    // Use standard locale, or array from dict if we want strict control
    // But standard locale is robust.
    // return date.toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'long', year: 'numeric' });
    // Actually, standard locale logic in `currentDate.toLocaleDateString` usually works fine for month header.
    return date.toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'long', year: 'numeric' });
  };

  const daysNames = t('days_names_short') as unknown as string[]; // Cast because t returns string | object in some advanced generic cases, but here string[]
  // Wait, my dictionary structure makes it array of strings? 
  // Standard simple i18n usually returns strings. 
  // My dict has: days_names_short: ["Sun", ...]
  // If my t implementation handles arrays? 
  // The provided `useLanguage` hook likely returns string, if it's simple key-value. 
  // If the dictionary has an array, does `t` return an array?
  // Let's assume standard behavior: if value is array, checking t implementation would be needed.
  // Viewing `dictionaries.ts` showed array. 
  // I should check `LanguageProvider.tsx` to be safe, but simpler is to use `(t('days_names_short') as any)[i]` if possible.
  // Or just hardcode logic based on language since it's only 2 langs.
  // Actually, assuming `t` returns the value from the dictionary directly.

  const getLocalizedDayName = (i: number) => {
    // Fallback if t returns nothing useful or string
    const arr = t('days_names_short');
    if (Array.isArray(arr)) return arr[i];
    // Fallback
    const en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return en[i];
  };


  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Investment': return 'bg-[var(--color-investment)]';
      case 'Fluid': return 'bg-[var(--color-fluid)]';
      case 'Fixed': return 'bg-[var(--color-fixed)]';
      case 'Liabilities': return 'bg-[var(--color-liabilities)]';
      case 'Receivables': return 'bg-[var(--color-receivables)]';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 font-sans text-foreground transition-colors duration-300">

      {/* Header & Stats */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('financial_calendar')}</h1>
              <p className="text-muted-foreground mt-1">{t('financial_calendar_desc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-card p-1 rounded-full border border-border shadow-sm self-start md:self-auto">
            <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-lg font-medium w-40 text-center tabular-nums text-foreground">
              {getMonthName(currentDate)}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-sm text-muted-foreground font-medium mb-1">{t('total_inflow')}</div>
            <div className="text-2xl font-bold text-trend-up flex items-center">
              <DollarSign className="w-5 h-5 text-muted-foreground mr-1" />
              {isPrivacyMode ? '****' : monthlyInflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-sm text-muted-foreground font-medium mb-1">{t('total_outflow')}</div>
            <div className="text-2xl font-bold text-trend-down flex items-center">
              <DollarSign className="w-5 h-5 text-muted-foreground mr-1" />
              {isPrivacyMode ? '****' : monthlyOutflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-sm text-muted-foreground font-medium mb-1">{t('net_flow')}</div>
            <div className={cn("text-2xl font-bold flex items-center", monthlyNetFlow >= 0 ? "text-trend-up" : "text-trend-down")}>
              <DollarSign className="w-5 h-5 opacity-50 mr-1" />
              {isPrivacyMode ? '****' : ((monthlyNetFlow > 0 ? '+' : '') + monthlyNetFlow.toLocaleString(undefined, { maximumFractionDigits: 0 }))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {Array.from({ length: 7 }, (_, i) => i).map(i => (
            <div key={i} className="py-2 md:py-4 text-center text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {getLocalizedDayName(i)}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)] md:auto-rows-[minmax(140px,auto)] divide-x divide-border bg-muted/10 text-sm">
          {blanks.map(i => <div key={`blank-${i}`} className="bg-muted/30" />)}

          {days.map(day => {
            const dayTxns = getTxnsForDay(day);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            // Calculate daily totals
            const dayInflow = dayTxns
              .filter(t => isInflow(t))
              .reduce((sum, t) => sum + getTxnValue(t), 0);

            const dayOutflow = dayTxns
              .filter(t => isOutflow(t))
              .reduce((sum, t) => sum + getTxnValue(t), 0);

            return (
              <div
                key={day}
                onClick={() => {
                  // Just use a separate state for "View Day Details"
                  // Actually, let's add a state `selectedDay` to open dialog
                  // Since I can't easily add state in `replace_file_content` without rewriting the whole component start, 
                  // I will use a separate `selectedDateDetails` state if possible or just assume I'll add it in valid scope.
                  // Wait, I am replacing the grid. I need to handle the click.
                  // Let's assume `handleDayClick` or `setSelectedDateDetails` is available.
                  // I will add the state in next step or full rewrite?
                  // No, I can replace the whole functional component or large chunk.
                  // Let's replace the return block mainly, assuming I add state at top.
                  // Actually, I should probably do a bigger replace or 2 steps.
                  // I'll use `setSelectedDate(new Date(year, month, day))`
                  handleDayClick(day);
                }}
                className={cn("p-1 md:p-2 transition-colors hover:bg-muted/50 group relative bg-opacity-40 min-h-[80px] md:min-h-[140px] flex flex-col cursor-pointer", isToday ? "bg-blue-50/50 dark:bg-blue-900/20" : "")}
              >
                <div className="flex justify-between items-start mb-1 md:mb-2">
                  <span className={cn(
                    "w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-xs md:text-sm font-semibold",
                    isToday ? "bg-foreground text-background shadow-md" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {day}
                  </span>
                </div>

                <div className="space-y-1 md:space-y-2 mt-auto">
                  {/* Income Card */}
                  {dayInflow > 0 && (
                    <div className="bg-trend-up-soft rounded-lg md:rounded-xl p-1 md:p-2.5 text-center md:text-left">
                      <div className="hidden md:block text-[10px] uppercase font-bold text-trend-up tracking-wider mb-0.5 opacity-80">{t('income')}</div>
                      <div className="font-bold text-trend-up text-[10px] md:text-sm truncate">
                        {isPrivacyMode ? '****' : `+${(dayInflow >= 1000000 ? (dayInflow / 1000000).toFixed(1) + 'M' : dayInflow >= 1000 ? (dayInflow / 1000).toFixed(1) + 'k' : dayInflow.toLocaleString(undefined, { maximumFractionDigits: 0 }))}`}
                      </div>
                    </div>
                  )}

                  {/* Expense Card */}
                  {dayOutflow > 0 && (
                    <div className="bg-trend-down-soft rounded-lg md:rounded-xl p-1 md:p-2.5 text-center md:text-left">
                      <div className="hidden md:block text-[10px] uppercase font-bold text-trend-down tracking-wider mb-0.5 opacity-80">{t('expense')}</div>
                      <div className="font-bold text-trend-down text-[10px] md:text-sm truncate">
                        {isPrivacyMode ? '****' : `-${(dayOutflow >= 1000000 ? (dayOutflow / 1000000).toFixed(1) + 'M' : dayOutflow >= 1000 ? (dayOutflow / 1000).toFixed(1) + 'k' : dayOutflow.toLocaleString(undefined, { maximumFractionDigits: 0 }))}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Dialog */}
      {selectedDate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-background rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-xl font-bold">
                {selectedDate.toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <button
                onClick={() => setSelectedDate(null)}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2">
              {getTxnsForDay(selectedDate.getDate()).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('no_transactions_on_day')}
                </div>
              ) : (
                <div className="space-y-3">
                  {getTxnsForDay(selectedDate.getDate()).map((txn: any, idx: number) => (
                    <div key={idx} className="bg-card p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                      <div>
                        <div className="font-bold">{txn.assetName}</div>
                        <div className="text-xs text-muted-foreground">
                          {t(txn.category as any) || txn.category}
                          {txn.ticker ? ` • ${txn.ticker}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("font-bold", isInflow(txn) ? "text-trend-up" : "text-trend-down")}>
                          {isInflow(txn) ? '+' : '-'}${getTxnValue(txn).toLocaleString()}
                        </div>
                        {/* <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                            {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
