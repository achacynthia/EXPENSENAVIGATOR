import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpDown, DollarSign, PieChart, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardsProps {
  totalExpenses: number;
  percentChange: number;
  highestCategory: string;
  recentEntriesCount: number;
}

export default function StatCards({
  totalExpenses,
  percentChange,
  highestCategory,
  recentEntriesCount
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Expenses (This Month)
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    ${totalExpenses.toFixed(2)}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 px-5 py-3">
          <div className="text-sm">
            <Link href="/expenses" className="font-medium text-primary hover:text-primary/90">
              View all
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowUpDown className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Compared to Last Month
                </dt>
                <dd>
                  <div className={cn(
                    "text-lg font-medium flex items-center",
                    percentChange < 0 ? "text-green-500" : percentChange > 0 ? "text-red-500" : "text-gray-500"
                  )}>
                    {percentChange < 0 ? <TrendingDown className="mr-1 h-4 w-4" /> : 
                     percentChange > 0 ? <TrendingUp className="mr-1 h-4 w-4" /> : null}
                    {Math.abs(percentChange).toFixed(1)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 px-5 py-3">
          <div className="text-sm">
            <Link href="/reports" className="font-medium text-primary hover:text-primary/90">
              View report
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PieChart className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Highest Category
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {highestCategory}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 px-5 py-3">
          <div className="text-sm">
            <Link href="/reports" className="font-medium text-primary hover:text-primary/90">
              View details
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Recent Entries
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {recentEntriesCount} expenses
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 px-5 py-3">
          <div className="text-sm">
            <Link href="/expenses" className="font-medium text-primary hover:text-primary/90">
              View all
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
