import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import StatCards from "@/components/dashboard/stat-cards";
import ExpenseChart from "@/components/dashboard/expense-chart";
import RecentExpenses from "@/components/dashboard/recent-expenses";
import AddExpenseDialog from "@/components/expense/add-expense-dialog";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const { user } = useAuth();

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const currentMonth = new Date().getMonth();
  const monthExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === currentMonth;
  });

  const lastMonthExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === currentMonth - 1;
  });

  const totalCurrentMonth = monthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  const totalLastMonth = lastMonthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  
  const percentChange = totalLastMonth === 0 
    ? 0 
    : ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100;

  // Get highest category by sum
  const categoryTotals = expenses?.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const highestCategory = Object.entries(categoryTotals).length > 0
    ? Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0]
    : "None";

  const recentExpensesCount = expenses?.length || 0;

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileNav />
        <main className="flex-1 relative overflow-y-auto focus:outline-none pt-16 lg:pt-0">
          <div className="py-6">
            <div className="responsive-container">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-bold gradient-heading">Dashboard</h1>
                  <p className="text-gray-500">Welcome back, {user?.name}!</p>
                </div>
                <button 
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium btn-gradient"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Expense
                </button>
              </div>
              
              <StatCards 
                totalExpenses={totalCurrentMonth}
                percentChange={percentChange}
                highestCategory={highestCategory}
                recentEntriesCount={recentExpensesCount}
              />
              
              <ExpenseChart expenses={expenses || []} />
              
              <RecentExpenses 
                expenses={expenses || []} 
                isLoading={isLoadingExpenses} 
              />
            </div>
          </div>
        </main>
      </div>
      
      <AddExpenseDialog 
        isOpen={isAddExpenseOpen} 
        onClose={() => setIsAddExpenseOpen(false)}
      />
    </div>
  );
}
