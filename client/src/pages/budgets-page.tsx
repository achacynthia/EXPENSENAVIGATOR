import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Budget } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import BudgetList from "@/components/budget/budget-list";
import CreateBudgetDialog from "@/components/budget/create-budget-dialog";

export default function BudgetsPage() {
  const { user } = useAuth();
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);

  // Add event listener for opening create budget dialog
  useEffect(() => {
    const handleOpenCreateDialog = () => {
      setIsCreateBudgetOpen(true);
    };

    window.addEventListener('open-create-budget-dialog', handleOpenCreateDialog);
    
    return () => {
      window.removeEventListener('open-create-budget-dialog', handleOpenCreateDialog);
    };
  }, []);

  const { data: budgets, isLoading, error } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
    queryFn: async () => {
      const response = await fetch("/api/budgets");
      if (!response.ok) {
        throw new Error("Failed to fetch budgets");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading budgets</p>
        <p className="text-sm text-gray-500 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Budget Management</h1>
        <Button onClick={() => setIsCreateBudgetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Budget
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-gray-600">
          Create and manage budgets to track your expenses by category.
        </p>
      </div>

      <BudgetList budgets={budgets || []} />

      <CreateBudgetDialog
        isOpen={isCreateBudgetOpen}
        onClose={() => setIsCreateBudgetOpen(false)}
      />
    </div>
  );
}