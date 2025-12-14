import React, { useEffect, useState, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { useTableData } from "@/hooks/use-table-data";
import { LoadingOverlay } from "@/components/skeleton-loader";
import { Footer } from "@/components/footer";
import { Database } from "lucide-react";
import { calculateDistance } from "@/utils/distance";
import type { CustomTable, TableColumn, TableRow } from "@shared/schema";

export default function CustomTableView() {
  const [, params] = useRoute("/custom/:shareId");
  const shareId = params?.shareId;

  const { 
    columns, 
    isLoading,
  } = useTableData();

  // Fetch custom table details
  const { data: customTable, isLoading: isLoadingTable, error } = useQuery<CustomTable>({
    queryKey: [`/api/custom-tables/share/${shareId}`],
    enabled: !!shareId,
  });

  // Fetch custom table rows
  const { data: rows = [], isLoading: isLoadingRows } = useQuery<TableRow[]>({
    queryKey: [`/api/custom-tables/${customTable?.id}/rows`],
    enabled: !!customTable?.id,
  });

  // Local state for interactive features (delivery filter ONLY - route filter hidden but still applied)
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryFilters, setDeliveryFilters] = useState<string[]>([]);
  const [routeFilters, setRouteFilters] = useState<string[]>([]);
  const [selectedRowForImage, setSelectedRowForImage] = useState<string | null>(null);

  // Apply filters and column visibility
  const { filteredRows, displayColumns, deliveryOptions } = useMemo(() => {
    if (rows.length === 0 || columns.length === 0) {
      return { 
        filteredRows: rows, 
        displayColumns: columns,
        deliveryOptions: []
      };
    }

    // Get unique delivery types
    const deliveries = Array.from(new Set(rows.map(row => row.delivery).filter(Boolean))) as string[];

    // Filter rows (clone to avoid mutating query cache)
    let filtered = [...rows];
    
    // Apply delivery alternate day-based filtering
    const today = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const isAlt1Day = [1, 3, 5, 0].includes(today); // Mon, Wed, Fri, Sun
    const isAlt2Day = [2, 4, 6].includes(today); // Tue, Thu, Sat
    
    // Sort based on delivery alternate and current day
    filtered = filtered.sort((a, b) => {
      const aAlt = a.deliveryAlt || "normal";
      const bAlt = b.deliveryAlt || "normal";
      
      // Inactive always at bottom
      if (aAlt === "inactive" && bAlt !== "inactive") return 1;
      if (aAlt !== "inactive" && bAlt === "inactive") return -1;
      
      // Priority based on day
      if (isAlt1Day) {
        // Alt1 and normal at top, alt2 at bottom
        if ((aAlt === "alt1" || aAlt === "normal") && bAlt === "alt2") return -1;
        if (aAlt === "alt2" && (bAlt === "alt1" || bAlt === "normal")) return 1;
      } else if (isAlt2Day) {
        // Alt2 and normal at top, alt1 at bottom
        if ((aAlt === "alt2" || aAlt === "normal") && bAlt === "alt1") return -1;
        if (aAlt === "alt1" && (bAlt === "alt2" || bAlt === "normal")) return 1;
      }
      
      return 0;
    });
    
    // Apply route filters
    if (routeFilters.length > 0) {
      filtered = filtered.filter(row => routeFilters.includes(row.route));
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply delivery filters (hide selected types)
    if (deliveryFilters.length > 0) {
      filtered = filtered.filter(row => !deliveryFilters.includes(row.delivery));
    }

    // Use all columns as visible, but hide latitude, longitude, and tollPrice (not in edit mode)
    const visibleCols = columns.filter(col => 
      col.dataKey !== 'latitude' && col.dataKey !== 'longitude' && col.dataKey !== 'tollPrice'
    );

    return { 
      filteredRows: filtered, 
      displayColumns: visibleCols,
      deliveryOptions: deliveries
    };
  }, [rows, columns, searchTerm, deliveryFilters, routeFilters]);

  // Calculate distances for kilometer column
  const rowsWithDistances = useMemo(() => {
    // Find QL Kitchen coordinates from full rows collection
    const qlKitchenRow = rows.find(row => row.location === "QL Kitchen");
    
    if (!qlKitchenRow || !qlKitchenRow.latitude || !qlKitchenRow.longitude) {
      return filteredRows.map(row => ({ ...row, kilometer: "—", segmentDistance: 0 }));
    }

    const qlLat = parseFloat(qlKitchenRow.latitude);
    const qlLng = parseFloat(qlKitchenRow.longitude);

    if (!Number.isFinite(qlLat) || !Number.isFinite(qlLng)) {
      return filteredRows.map(row => ({ ...row, kilometer: "—", segmentDistance: 0 }));
    }

    // Check if any filters are active
    const hasActiveFilters = searchTerm !== "" || routeFilters.length > 0 || deliveryFilters.length > 0;

    if (!hasActiveFilters) {
      // NO FILTERS: Calculate direct distance from QL Kitchen to each route
      return filteredRows.map((row) => {
        if (row.location === "QL Kitchen") {
          return { ...row, kilometer: 0, segmentDistance: 0 };
        }

        if (!row.latitude || !row.longitude) {
          return { ...row, kilometer: "—", segmentDistance: 0 };
        }

        const currentLat = parseFloat(row.latitude);
        const currentLng = parseFloat(row.longitude);

        if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) {
          return { ...row, kilometer: "—", segmentDistance: 0 };
        }

        const directDistance = calculateDistance(qlLat, qlLng, currentLat, currentLng);
        return { ...row, kilometer: directDistance, segmentDistance: directDistance };
      });
    } else {
      // FILTERS ACTIVE: Calculate cumulative distance
      let cumulativeDistance = 0;
      let previousLat = qlLat;
      let previousLng = qlLng;

      return filteredRows.map((row) => {
        if (row.location === "QL Kitchen") {
          cumulativeDistance = 0;
          previousLat = qlLat;
          previousLng = qlLng;
          return { ...row, kilometer: 0, segmentDistance: 0 };
        }

        if (!row.latitude || !row.longitude) {
          return { ...row, kilometer: "—", segmentDistance: 0 };
        }

        const currentLat = parseFloat(row.latitude);
        const currentLng = parseFloat(row.longitude);

        if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) {
          return { ...row, kilometer: "—", segmentDistance: 0 };
        }

        const segmentDistance = calculateDistance(previousLat, previousLng, currentLat, currentLng);
        cumulativeDistance += segmentDistance;

        previousLat = currentLat;
        previousLng = currentLng;

        return { ...row, kilometer: cumulativeDistance, segmentDistance };
      });
    }
  }, [rows, filteredRows, searchTerm, routeFilters, deliveryFilters]);

  // Create read-only mutations (they work but don't persist)
  const readOnlyUpdateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<any> }) => {
      console.log("Read-only mode: Changes not saved", data);
      return data;
    },
  });

  const readOnlyDeleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      console.log("Read-only mode: Delete not allowed", id);
    },
  });

  const readOnlyReorderRowsMutation = useMutation<TableRow[], Error, string[]>({
    mutationFn: async (rowIds: string[]) => {
      const reordered = rowIds
        .map(id => rows.find(r => r.id === id))
        .filter((r): r is TableRow => r !== undefined);
      return reordered;
    },
  });

  const readOnlyReorderColumnsMutation = useMutation<TableColumn[], Error, string[]>({
    mutationFn: async (columnIds: string[]) => {
      const reordered = columnIds
        .map(id => columns.find(c => c.id === id))
        .filter((c): c is TableColumn => c !== undefined);
      return reordered;
    },
  });

  const readOnlyDeleteColumnMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      console.log("Read-only mode: Column delete not allowed", id);
    },
  });

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setDeliveryFilters([]);
  };

  // Enhanced loading state - ensure minimum 5 second display
  const [minLoadingComplete, setMinLoadingComplete] = React.useState(false);

  React.useEffect(() => {
    // Minimum 5 second loading timer
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading overlay until data is loaded AND minimum timer complete
  if (isLoading || isLoadingTable || isLoadingRows || !minLoadingComplete) {
    return (
      <div className="min-h-screen relative">
        <LoadingOverlay message="Loading Custom Table..." type="ripple" />
      </div>
    );
  }

  if (error || !customTable) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <Database className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Custom Table Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            The custom table you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-[100] w-full border-b-2 border-blue-500/50 dark:border-blue-400/50 bg-white dark:bg-black shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between text-[12px]">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
                  <img 
                    src="/assets/FamilyMart.png" 
                    alt="Logo" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="font-bold text-slate-600 dark:text-slate-300" style={{ fontSize: '14px' }}>
                  {customTable.name}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Custom Table View
            </div>
          </div>
        </div>
      </nav>

      <main className="bg-white dark:bg-black min-h-screen" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top) + 1rem)' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Data Table with all interactive features enabled */}
          <DataTable
            rows={rowsWithDistances}
            columns={displayColumns}
            editMode={false}
            isSharedView={true}
            hideShareButton={true}
            onUpdateRow={readOnlyUpdateMutation as any}
            onDeleteRow={readOnlyDeleteMutation as any}
            onReorderRows={readOnlyReorderRowsMutation as any}
            onReorderColumns={readOnlyReorderColumnsMutation as any}
            onDeleteColumn={readOnlyDeleteColumnMutation as any}
            onSelectRowForImage={setSelectedRowForImage}
            onShowCustomization={() => {}}
            onOptimizeRoute={() => {}}
            isAuthenticated={false}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            filterValue={[]}
            onFilterValueChange={() => {}}
            deliveryFilterValue={deliveryFilters}
            onDeliveryFilterValueChange={setDeliveryFilters}
            routeOptions={[]}
            deliveryOptions={deliveryOptions}
            onClearAllFilters={handleClearAllFilters}
            filteredRowsCount={rowsWithDistances.length}
            totalRowsCount={rows.length}
          />
        </div>
      </main>

      <Footer editMode={false} />
    </>
  );
}
