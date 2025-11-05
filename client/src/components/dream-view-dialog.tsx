import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type DreamViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMetrics: {
    revenue: number;
    cogs: number;
    payroll: number;
    expenses: number;
    profit: number;
    margin: number;
  };
};

export function DreamViewDialog({ open, onOpenChange, currentMetrics }: DreamViewDialogProps) {
  const [salaries, setSalaries] = useState({
    ryanSorensen: '',
    jacalynPhillips: '',
    leanneAnthon: '',
    lynleyGray: ''
  });

  // Calculate total officer salaries
  const totalOfficerSalaries = 
    (parseFloat(salaries.ryanSorensen) || 0) +
    (parseFloat(salaries.jacalynPhillips) || 0) +
    (parseFloat(salaries.leanneAnthon) || 0) +
    (parseFloat(salaries.lynleyGray) || 0);

  // Calculate new metrics with officer salaries
  const newPayroll = currentMetrics.payroll + totalOfficerSalaries;
  const newExpenses = currentMetrics.expenses + totalOfficerSalaries;
  const newProfit = currentMetrics.revenue - currentMetrics.cogs - newExpenses;
  const newMargin = currentMetrics.revenue > 0 ? (newProfit / currentMetrics.revenue) * 100 : 0;

  // Calculate deltas
  const profitDelta = newProfit - currentMetrics.profit;
  const marginDelta = newMargin - currentMetrics.margin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Dream View - Officer Salary Impact Modeling
          </DialogTitle>
          <DialogDescription>
            Model the impact of officer salaries on company profitability and margins
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Officer Salary Inputs */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg text-purple-700">Officer Salaries</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ryan-salary" className="font-semibold">
                  Ryan Sorensen (Monthly)
                </Label>
                <Input
                  id="ryan-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={salaries.ryanSorensen}
                  onChange={(e) => setSalaries(prev => ({ ...prev, ryanSorensen: e.target.value }))}
                  data-testid="input-ryan-salary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jacalyn-salary" className="font-semibold">
                  Jacalyn Phillips (Monthly)
                </Label>
                <Input
                  id="jacalyn-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={salaries.jacalynPhillips}
                  onChange={(e) => setSalaries(prev => ({ ...prev, jacalynPhillips: e.target.value }))}
                  data-testid="input-jacalyn-salary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leanne-salary" className="font-semibold">
                  Leanne Anthon (Monthly)
                </Label>
                <Input
                  id="leanne-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={salaries.leanneAnthon}
                  onChange={(e) => setSalaries(prev => ({ ...prev, leanneAnthon: e.target.value }))}
                  data-testid="input-leanne-salary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lynley-salary" className="font-semibold">
                  Lynley Gray (Monthly)
                </Label>
                <Input
                  id="lynley-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={salaries.lynleyGray}
                  onChange={(e) => setSalaries(prev => ({ ...prev, lynleyGray: e.target.value }))}
                  data-testid="input-lynley-salary"
                />
              </div>

              <div className="col-span-2 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Officer Salaries:</span>
                  <span className="font-bold text-xl text-purple-600">
                    ${totalOfficerSalaries.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Before/After Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Metrics */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg text-blue-700">Current Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="font-bold text-green-600">${currentMetrics.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">COGS:</span>
                  <span className="font-bold text-red-600">${currentMetrics.cogs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payroll:</span>
                  <span className="font-bold text-red-600">${currentMetrics.payroll.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Expenses:</span>
                  <span className="font-bold text-red-600">${currentMetrics.expenses.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Profit:</span>
                  <span className="font-bold text-xl text-green-600">${currentMetrics.profit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Margin:</span>
                  <span className="font-bold text-xl text-blue-600">{currentMetrics.margin.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Projected Metrics */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-lg text-purple-700">With Officer Salaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="font-bold text-green-600">${currentMetrics.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">COGS:</span>
                  <span className="font-bold text-red-600">${currentMetrics.cogs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payroll:</span>
                  <span className="font-bold text-red-600">${newPayroll.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Expenses:</span>
                  <span className="font-bold text-red-600">${newExpenses.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Profit:</span>
                  <span className={`font-bold text-xl ${newProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${newProfit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Margin:</span>
                  <span className={`font-bold text-xl ${newMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {newMargin.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Impact Summary */}
          <Card className="border-2 border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="text-lg text-orange-700 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Profit Impact:</span>
                <div className="flex items-center gap-2">
                  {profitDelta < 0 && <TrendingDown className="h-5 w-5 text-red-500" />}
                  {profitDelta > 0 && <TrendingUp className="h-5 w-5 text-green-500" />}
                  <span className={`font-bold text-lg ${profitDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitDelta >= 0 ? '+' : ''} ${profitDelta.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Margin Impact:</span>
                <div className="flex items-center gap-2">
                  {marginDelta < 0 && <TrendingDown className="h-5 w-5 text-red-500" />}
                  {marginDelta > 0 && <TrendingUp className="h-5 w-5 text-green-500" />}
                  <span className={`font-bold text-lg ${marginDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marginDelta >= 0 ? '+' : ''}{marginDelta.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
