import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface EditableCellProps {
  value: any;
  type: string;
  onSave: (value: any) => void;
  options?: string[];
  dataKey?: string;
}

export function EditableCell({ value, type, onSave, options, dataKey }: EditableCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Only update editValue when not currently saving
    if (!isSaving) {
      setEditValue(value);
    }
  }, [value, isSaving]);

  // Reset isSaving when popover closes
  useEffect(() => {
    if (!isOpen) {
      setIsSaving(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return; // Prevent double saves
    
    setIsSaving(true);
    let processedValue = editValue;
    
    if (type === 'number') {
      processedValue = parseInt(editValue) || 0;
    } else if (type === 'currency') {
      processedValue = parseFloat(editValue.toString().replace(/[^0-9.]/g, '')) || 0;
      processedValue = processedValue.toFixed(2);
    }
    
    try {
      await onSave(processedValue);
      setIsOpen(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, type, onSave, isSaving]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsOpen(false);
    setIsSaving(false);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [value]);

  const getPlaceholder = () => {
    if (dataKey === 'latitude') {
      return "e.g. 3.139003";
    }
    if (dataKey === 'longitude') {
      return "e.g. 101.686855";
    }
    if (type === 'currency') {
      return "0.00";
    }
    if (type === 'number') {
      return "Enter number";
    }
    return "Enter value";
  };

  // For route and delivery - use select with popover
  if (['route', 'delivery'].includes(dataKey || '') && options && options.length > 0) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <span
            className="cursor-pointer hover:bg-blue-500/10 hover:border hover:border-blue-500/30 rounded-lg px-2 py-1 transition-all inline-block min-w-[60px] text-center"
            data-testid="text-editable-cell"
          >
            {value || <span className="text-gray-400">—</span>}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="center">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Select {dataKey}
            </div>
            <Select 
              value={editValue || ''} 
              onValueChange={async (newValue) => {
                setIsSaving(true);
                setEditValue(newValue);
                try {
                  await onSave(newValue);
                  setIsOpen(false);
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder={`Select ${dataKey}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // For code, location - use popover with input
  if (['code', 'location'].includes(dataKey || '')) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <span
            className="cursor-pointer hover:bg-blue-500/10 hover:border hover:border-blue-500/30 rounded-lg px-2 py-1 transition-all inline-block min-w-[60px] text-center"
            data-testid="text-editable-cell"
          >
            {value || <span className="text-gray-400">—</span>}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="center">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Edit {dataKey}
            </div>
            <Input
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full h-9 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-7 px-3 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // For select type
  if (type === 'select' && options) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <span
            className="cursor-pointer hover:bg-blue-500/10 hover:border hover:border-blue-500/30 rounded-lg px-2 py-1 transition-all inline-block min-w-[60px] text-center"
            data-testid="text-editable-cell"
          >
            {value || <span className="text-gray-400">—</span>}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="center">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Select {dataKey}
            </div>
            <Select 
              value={editValue || ''} 
              onValueChange={async (newValue) => {
                setIsSaving(true);
                setEditValue(newValue);
                try {
                  await onSave(newValue);
                  setIsOpen(false);
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // For other fields - use popover with input
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span
          className="cursor-pointer hover:bg-blue-500/10 hover:border hover:border-blue-500/30 rounded-lg px-2 py-1 transition-all inline-block min-w-[40px] text-center"
          data-testid="text-editable-cell"
        >
          {value || <span className="text-gray-400">—</span>}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="center">
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Edit {dataKey || 'Value'}
          </div>
          <Input
            type={type === 'number' || type === 'currency' ? 'number' : 'text'}
            step={type === 'currency' ? '0.01' : undefined}
            value={type === 'currency' ? editValue.toString().replace(/[^0-9.]/g, '') : editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full h-9 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-7 px-3 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
