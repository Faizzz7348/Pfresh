import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { RouteOptimizationRequest, RouteOptimizationResponse, TableRow } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, TrendingDown, Clock, Droplets, Route, Zap, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RouteOptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: TableRow[];
  selectedRowIds?: string[];
}

export function RouteOptimizationModal({
  open,
  onOpenChange,
  rows,
  selectedRowIds,
}: RouteOptimizationModalProps) {
  const [algorithm, setAlgorithm] = useState<'nearest_neighbor' | 'genetic' | 'simulated_annealing'>('nearest_neighbor');
  const [prioritizeDelivery, setPrioritizeDelivery] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<RouteOptimizationResponse | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const optimizationMutation = useMutation({
    mutationFn: async () => {
      const requestData: RouteOptimizationRequest = {
        ...(selectedRowIds && selectedRowIds.length > 0 ? { rowIds: selectedRowIds } : {}),
        algorithm,
        prioritizeDelivery,
        vehicleSpecs: {
          type: "lorry refrigerator 1 ton",
          fuelType: "diesel",
          tollClass: 1,
        },
      };
      
      const response = await apiRequest("POST", "/api/optimize-route", requestData);
      return await response.json();
    },
    onSuccess: (data: RouteOptimizationResponse) => {
      // Validate response structure
      if (!data || !Array.isArray(data.optimizedOrder) || data.optimizedOrder.length === 0) {
        toast({
          title: "Invalid Response",
          description: "The optimization response was invalid. Please try again.",
          variant: "destructive",
        });
        return;
      }
      setOptimizationResult(data);
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize route. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applyOptimizationMutation = useMutation({
    mutationFn: async () => {
      if (!optimizationResult) return;
      
      // Build full reorder array: optimized rows first, then remaining rows in their current order
      const optimizedIds = new Set(optimizationResult.optimizedOrder);
      const remainingRows = rows
        .filter(row => !optimizedIds.has(row.id))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(row => row.id);
      
      const fullOrderedIds = [...optimizationResult.optimizedOrder, ...remainingRows];
      
      // Reorder rows with full list
      const response = await apiRequest("POST", "/api/table-rows/reorder", { rowIds: fullOrderedIds });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/table-rows"] });
      toast({
        title: "Route Applied",
        description: "The optimized route has been applied successfully!",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Apply Route",
        description: error.message || "Failed to apply the optimized route. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOptimize = () => {
    setOptimizationResult(null);
    optimizationMutation.mutate();
  };

  const handleApply = () => {
    applyOptimizationMutation.mutate();
  };

  const handleClose = () => {
    setOptimizationResult(null);
    onOpenChange(false);
  };

  const getAlgorithmDescription = (algo: string) => {
    switch (algo) {
      case 'nearest_neighbor':
        return 'Fast and efficient. Best for most routes. Finds nearby stops first.';
      case 'genetic':
        return 'AI-powered evolution. Best for complex routes with many stops.';
      case 'simulated_annealing':
        return 'Balanced approach. Good for medium-sized routes with obstacles.';
      default:
        return '';
    }
  };

  const rowsToOptimize = selectedRowIds && selectedRowIds.length > 0
    ? rows.filter(row => selectedRowIds.includes(row.id) && row.sortOrder !== -1)
    : rows.filter(row => row.sortOrder !== -1);

  const validRows = rowsToOptimize.filter(
    row => row.latitude && row.longitude && parseFloat(row.latitude) !== 0 && parseFloat(row.longitude) !== 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2m max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-background/95 via-background/98 to-background dark:from-black/95 dark:via-black/98 dark:to-black border-2 border-blue-500/20 dark:border-blue-400/20 transition-smooth" data-testid="modal-route-optimization">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-1m font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Route className="w-6 h-6" />
            AI Route Optimization
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600 dark:text-slate-300">
            Optimize your delivery route to save time, fuel, and distance using advanced AI algorithms.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
        {!optimizationResult ? (
          <div className="space-y-6 mt-4">
            <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    {validRows.length} stops ready to optimize
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedRowIds && selectedRowIds.length > 0
                      ? `Optimizing ${validRows.length} selected locations with valid coordinates`
                      : `Optimizing all ${validRows.length} locations with valid coordinates`}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Choose Algorithm</Label>
                <RadioGroup value={algorithm} onValueChange={(value: any) => setAlgorithm(value)} className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer" data-testid="radio-algorithm-nearest-neighbor">
                    <RadioGroupItem value="nearest_neighbor" id="nearest_neighbor" />
                    <div className="flex-1">
                      <Label htmlFor="nearest_neighbor" className="font-medium cursor-pointer text-slate-700 dark:text-slate-200">
                        Nearest Neighbor (Recommended)
                      </Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {getAlgorithmDescription('nearest_neighbor')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 cursor-pointer" data-testid="radio-algorithm-genetic">
                    <RadioGroupItem value="genetic" id="genetic" />
                    <div className="flex-1">
                      <Label htmlFor="genetic" className="font-medium cursor-pointer text-slate-700 dark:text-slate-200">
                        Genetic Algorithm (Advanced)
                      </Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {getAlgorithmDescription('genetic')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/50 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-200 cursor-pointer" data-testid="radio-algorithm-simulated-annealing">
                    <RadioGroupItem value="simulated_annealing" id="simulated_annealing" />
                    <div className="flex-1">
                      <Label htmlFor="simulated_annealing" className="font-medium cursor-pointer text-slate-700 dark:text-slate-200">
                        Simulated Annealing
                      </Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {getAlgorithmDescription('simulated_annealing')}
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-green-50/50 dark:hover:bg-green-950/30 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200">
                <div className="flex-1">
                  <Label htmlFor="prioritize-delivery" className="font-medium cursor-pointer text-slate-700 dark:text-slate-200">
                    Prioritize Delivery Grouping
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Group locations with the same delivery type together
                  </p>
                </div>
                <Switch
                  id="prioritize-delivery"
                  checked={prioritizeDelivery}
                  onCheckedChange={setPrioritizeDelivery}
                  data-testid="switch-prioritize-delivery"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleOptimize}
                disabled={optimizationMutation.isPending || validRows.length < 2}
                variant="outline"
                className="flex-1"
                size="lg"
                data-testid="button-optimize"
              >
                {optimizationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Optimize Route
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={optimizationMutation.isPending}
                className="border-red-600 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-950/30"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 p-6 rounded-lg border-2 border-green-500/30 dark:border-green-400/30">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="text-xl font-bold text-green-900 dark:text-green-100">
                  Optimization Complete!
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-black/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg hover:scale-105" data-testid="stat-distance-saved">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-muted-foreground">Distance</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    -{optimizationResult.distanceSaved.toFixed(1)} km
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {optimizationResult.optimizationFactors.distanceReduction.toFixed(1)}% reduction
                  </p>
                </div>

                <div className="bg-white/60 dark:bg-black/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 hover:shadow-lg hover:scale-105" data-testid="stat-time-saved">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-muted-foreground">Time</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {optimizationResult.timeSaved.toFixed(0)} min
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">saved per trip</p>
                </div>

                <div className="bg-white/60 dark:bg-black/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-green-50/70 dark:hover:bg-green-950/40 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover:shadow-lg hover:scale-105" data-testid="stat-fuel-saved">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-muted-foreground">Fuel</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {optimizationResult.fuelSaved.toFixed(2)} L
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">less consumption</p>
                </div>

                <div className="bg-white/60 dark:bg-black/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-orange-50/70 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-lg hover:scale-105" data-testid="stat-optimized-distance">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-muted-foreground">New Total</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {optimizationResult.optimizedDistance.toFixed(1)} km
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    from {optimizationResult.originalDistance.toFixed(1)} km
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 dark:bg-muted/20 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Zap className="w-4 h-4" />
                Algorithm Used
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {optimizationResult.algorithm === 'nearest_neighbor' && 'Nearest Neighbor with 2-Opt optimization'}
                {optimizationResult.algorithm === 'genetic' && 'Genetic Algorithm with population-based evolution'}
                {optimizationResult.algorithm === 'simulated_annealing' && 'Simulated Annealing with probabilistic search'}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleApply}
                disabled={applyOptimizationMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
                data-testid="button-apply-optimization"
              >
                {applyOptimizationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply Optimized Route
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={applyOptimizationMutation.isPending}
                data-testid="button-close"
              >
                Close
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
