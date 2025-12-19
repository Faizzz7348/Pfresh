import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Database, Settings, Save, DoorOpen, Rows, Receipt, Layout, Sun, Moon, Bookmark, Plus, ChevronDown, Menu, BookOpen, LayoutGrid, ListChecks, Calendar, Palette, Dock } from "lucide-react";
import { useLocation } from "wouter";
import { AddColumnModal } from "./add-column-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  editMode?: boolean;
  onEditModeRequest?: () => void;
  onShowCustomization?: () => void;
  onAddRow?: () => void;
  onSaveData?: () => void;
  onGenerateTng?: () => void;
  onAddColumn?: (columnData: { name: string; dataKey: string; type: string; options?: string[] }) => Promise<void>;
  onOptimizeRoute?: () => void;
  onCalculateTolls?: () => void;
  onSaveLayout?: () => void;
  onSavedLinks?: () => void;
  onShowTutorial?: () => void;
  onBulkColorEdit?: () => void;
  isAuthenticated?: boolean;
  theme?: string;
  onToggleTheme?: () => void;
  showFloatingDock?: boolean;
  onToggleFloatingDock?: () => void;
}

export function Navigation({ editMode, onEditModeRequest, onShowCustomization, onAddRow, onSaveData, onGenerateTng, onAddColumn, onOptimizeRoute, onCalculateTolls, onSaveLayout, onSavedLinks, onShowTutorial, onBulkColorEdit, isAuthenticated, theme, onToggleTheme, showFloatingDock, onToggleFloatingDock }: NavigationProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return date.toLocaleString('en-US', options);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] w-full bg-white dark:bg-black shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full border-b-2 border-blue-500/50 dark:border-blue-400/50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between text-[12px]">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
                <img 
                  src="/assets/FamilyMart.png" 
                  alt="Logo" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-600 dark:text-slate-300" style={{ fontSize: '12px' }}>
                  {editMode ? "Edit Mode" : "Route Management"}
                </span>
                <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: '10px' }}>
                  All in one data informations
                </span>
              </div>
            </div>
          </div>

          {/* Navigation - Floating Dock Toggle + Theme Toggle + Menu Button */}
          <div className="flex items-center gap-2">
            {/* Floating Dock Toggle Button - Only in Edit Mode */}
            {editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFloatingDock}
                className="btn-glass w-8 h-8 p-0 pagination-button rounded-xl group transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 active:shadow-none"
                data-testid="button-toggle-floating-dock"
                title={showFloatingDock ? 'Hide Floating Dock' : 'Show Floating Dock'}
              >
                <Dock className={`w-4 h-4 transition-all duration-300 ${
                  showFloatingDock 
                    ? 'text-cyan-500 dark:text-cyan-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
              </Button>
            )}
            
            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTheme}
              className="btn-glass w-8 h-8 p-0 pagination-button rounded-xl group transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 active:shadow-none"
              data-testid="button-toggle-theme"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-yellow-500 transition-all duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-blue-500 transition-all duration-300" />
              )}
            </Button>

            {/* Menu Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-glass w-8 h-8 md:w-auto md:h-9 p-0 md:px-3 pagination-button rounded-xl group transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 active:shadow-none"
                  data-testid="button-main-menu"
                  title="Menu"
                >
                  <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400 transition-all duration-300" />
                  <span className="hidden md:inline ml-2 text-xs transition-all duration-300">Menu</span>
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-white/95 dark:bg-black/95 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 shadow-[0_20px_60px_0_rgba(0,0,0,0.25)] rounded-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
            >
              {/* Day and Date Display - Carousel Style for Dark Mode */}
              <div className="mx-1 my-2 mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-white/80 dark:from-blue-950/40 dark:to-gray-900/40 border border-blue-200/50 dark:border-blue-500/20">
                <div className="text-center">
                  <div className="font-bold text-gray-500 dark:text-blue-300" style={{ fontSize: '12px' }}>
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '10px', marginTop: '2px' }}>
                    {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Saved Links */}
              <DropdownMenuItem 
                onClick={onSavedLinks}
                className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-amber-50 dark:hover:bg-amber-900/50 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="menu-saved-links"
              >
                <Bookmark className="w-4 h-4 mr-2 text-amber-500 dark:text-amber-400 transition-transform duration-200 group-hover:scale-110" />
                <span style={{fontSize: '10px'}} className="font-medium">Saved Links</span>
              </DropdownMenuItem>

              {/* Custom Tables */}
              <DropdownMenuItem 
                onClick={() => navigate('/custom-tables')}
                className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/50 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="menu-custom-tables"
              >
                <ListChecks className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400 transition-transform duration-200 group-hover:scale-110" />
                <span style={{fontSize: '10px'}} className="font-medium">Custom Tables</span>
              </DropdownMenuItem>

              {/* Calendar */}
              <DropdownMenuItem 
                onClick={() => navigate('/calendar')}
                className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="menu-calendar"
              >
                <Calendar className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400 transition-transform duration-200 group-hover:scale-110" />
                <span style={{fontSize: '10px'}} className="font-medium">Calendar</span>
              </DropdownMenuItem>

              {/* Help Guide */}
              <DropdownMenuItem 
                onClick={() => navigate('/help')}
                className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/50 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="menu-help-guide"
              >
                <BookOpen className="w-4 h-4 mr-2 text-green-600 dark:text-green-400 transition-transform duration-200 group-hover:scale-110" />
                <span style={{fontSize: '10px'}} className="font-medium">User Guide</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-2" />

              {/* Edit Mode Options */}
              {editMode ? (
                <>
                  <DropdownMenuItem 
                    onClick={onAddRow}
                    className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:scale-[1.02] active:scale-[0.98]"
                    data-testid="menu-add-row"
                  >
                    <Rows className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                    <span style={{fontSize: '10px'}} className="font-medium">Add Row</span>
                  </DropdownMenuItem>
                  {onAddColumn && (
                    <DropdownMenuItem 
                      onClick={() => {
                        // Trigger add column modal
                        const addColumnButton = document.querySelector('[data-testid="button-add-column"]') as HTMLButtonElement;
                        if (addColumnButton) addColumnButton.click();
                      }}
                      className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:scale-[1.02] active:scale-[0.98]"
                      data-testid="menu-add-column"
                    >
                      <Plus className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                      <span style={{fontSize: '10px'}} className="font-medium">Add Column</span>
                    </DropdownMenuItem>
                  )}
                  {onBulkColorEdit && (
                    <DropdownMenuItem 
                      onClick={onBulkColorEdit}
                      className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/50 hover:scale-[1.02] active:scale-[0.98]"
                      data-testid="menu-bulk-color"
                    >
                      <Palette className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400 transition-transform duration-200 group-hover:scale-110" />
                      <span style={{fontSize: '10px'}} className="font-medium">Set Color by Route</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-2" />
                  <DropdownMenuItem 
                    onClick={onEditModeRequest}
                    className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/50 hover:scale-[1.02] active:scale-[0.98] text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    data-testid="menu-exit-edit"
                  >
                    <DoorOpen className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                    <span style={{fontSize: '10px'}} className="font-medium">Exit Edit Mode</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem 
                  onClick={onEditModeRequest}
                  className="cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/50 hover:scale-[1.02] active:scale-[0.98]"
                  data-testid="menu-enter-edit"
                >
                  <Settings className="w-4 h-4 mr-2 text-red-900 dark:text-red-400 transition-transform duration-200 group-hover:scale-110" />
                  <span style={{fontSize: '10px'}} className="font-medium">Edit Mode</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Hidden Add Column Modal - triggered from dropdown */}
          {editMode && onAddColumn && (
            <div className="hidden">
              <AddColumnModal
                onCreateColumn={onAddColumn}
                disabled={!isAuthenticated}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}