import { useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subMonths, compareAsc } from 'date-fns';
import { Expense } from "@shared/schema";

interface ExpenseChartProps {
  expenses: Expense[];
}

type ProcessedData = {
  month: string;
  [category: string]: string | number;
};

export default function ExpenseChart({ expenses }: ExpenseChartProps) {
  // Get data for the last 6 months
  const today = new Date();
  const sixMonthsAgo = subMonths(today, 6);
  
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return compareAsc(expenseDate, sixMonthsAgo) >= 0;
  });

  // Get unique categories
  const categories = [...new Set(filteredExpenses.map(expense => expense.category))];
  
  // Prepare data for chart
  const chartData = useMemo(() => {
    const months: Record<string, ProcessedData> = {};
    
    // Initialize empty data for each month in the last 6 months
    for (let i = 0; i < 6; i++) {
      const date = subMonths(today, i);
      const monthKey = format(date, 'MMM');
      
      months[monthKey] = {
        month: monthKey,
      };
      
      // Initialize all categories with 0
      categories.forEach(category => {
        months[monthKey][category] = 0;
      });
    }
    
    // Fill in actual data
    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const monthKey = format(expenseDate, 'MMM');
      
      if (months[monthKey]) {
        months[monthKey][expense.category] = 
          (months[monthKey][expense.category] as number || 0) + expense.amount;
      }
    });
    
    // Convert to array and sort by month
    return Object.values(months).sort((a, b) => {
      const monthA = new Date(`${a.month} 1, 2000`).getMonth();
      const monthB = new Date(`${b.month} 1, 2000`).getMonth();
      return monthA - monthB;
    });
  }, [filteredExpenses, categories, today]);

  // Colors for the different categories
  const categoryColors: Record<string, string> = {
    Groceries: "#3b82f6",
    Utilities: "#10b981",
    Entertainment: "#6366f1",
    Housing: "#f59e0b",
    Shopping: "#ef4444",
    Health: "#8b5cf6",
    Transportation: "#ec4899",
    Other: "#64748b"
  };

  // Generate colors for any other categories
  categories.forEach((category, index) => {
    if (!categoryColors[category]) {
      const colors = [
        "#3b82f6", "#10b981", "#6366f1", "#f59e0b", 
        "#ef4444", "#8b5cf6", "#ec4899", "#64748b"
      ];
      categoryColors[category] = colors[index % colors.length];
    }
  });

  return (
    <Card className="mt-8">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle>Expense Trends</CardTitle>
        <CardDescription>
          Last 6 months of expenses by category
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} 
              />
              <Legend />
              {categories.map((category) => (
                <Bar 
                  key={category}
                  dataKey={category} 
                  stackId="a" 
                  fill={categoryColors[category]} 
                  name={category}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-4">
          {categories.map((category) => (
            <div key={category} className="flex items-center">
              <div 
                className="w-4 h-4 rounded mr-2" 
                style={{ backgroundColor: categoryColors[category] }}
              ></div>
              <span className="text-sm text-gray-600">{category}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
