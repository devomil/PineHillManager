import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDateRangeOptions, formatDateForAPI, getDateRangeLabel, type DateRangeOption } from '@/lib/date-ranges';

interface DateRangePickerProps {
  value: string;
  onValueChange: (value: string, startDate: string, endDate: string) => void;
  className?: string;
}

export function DateRangePicker({ value, onValueChange, className }: DateRangePickerProps) {
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  
  const dateRangeOptions = getDateRangeOptions();
  const selectedOption = dateRangeOptions.find(option => option.value === value);
  
  const handlePresetSelect = (option: DateRangeOption) => {
    const startDate = formatDateForAPI(option.startDate);
    const endDate = formatDateForAPI(option.endDate);
    onValueChange(option.value, startDate, endDate);
  };
  
  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      onValueChange('custom', customStartDate, customEndDate);
      setIsCustomDialogOpen(false);
    }
  };
  
  const getDisplayLabel = () => {
    if (value === 'custom' && customStartDate && customEndDate) {
      return getDateRangeLabel(customStartDate, customEndDate);
    }
    return selectedOption?.label || 'This Year';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`w-[200px] justify-between ${className}`}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{getDisplayLabel()}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {dateRangeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => handlePresetSelect(option)}
              className={value === option.value ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsCustomDialogOpen(true);
            }}
            className={value === 'custom' ? 'bg-accent' : ''}
          >
            Custom Date Range
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
            <DialogDescription>
              Choose your own start and end dates for custom analytics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsCustomDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!customStartDate || !customEndDate}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}