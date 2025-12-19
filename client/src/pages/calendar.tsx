import { useState, useEffect } from "react";
import { Footer } from "@/components/footer";
import { useTheme } from "@/components/theme-provider";
import { useLocation } from "wouter";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ArrowLeft, Sun, Moon, Clock, Pencil } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  description?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export default function CalendarPage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [showFloatingDock, setShowFloatingDock] = useState(() => {
    const saved = localStorage.getItem('showFloatingDock');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Tooltip state
  const [tooltipEvent, setTooltipEvent] = useState<CalendarEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Multiple events popover state
  const [showEventsPopover, setShowEventsPopover] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);
  const [selectedDateInfo, setSelectedDateInfo] = useState<{ day: string; date: string } | null>(null);
  
  // Edit mode with persistence
  const [editMode, setEditMode] = useState(() => {
    const savedEditMode = localStorage.getItem('calendarEditMode');
    const savedTimestamp = localStorage.getItem('calendarEditModeTimestamp');
    
    if (savedEditMode && savedTimestamp) {
      const now = Date.now();
      const timestamp = parseInt(savedTimestamp, 10);
      const hoursSinceLastActivity = (now - timestamp) / (1000 * 60 * 60);
      
      // Reset edit mode if inactive for more than 2 hours
      if (hoursSinceLastActivity > 2) {
        localStorage.removeItem('calendarEditMode');
        localStorage.removeItem('calendarEditModeTimestamp');
        return false;
      }
      
      return JSON.parse(savedEditMode);
    }
    
    return false;
  });
  
  // Update timestamp whenever user interacts in edit mode
  useEffect(() => {
    if (editMode) {
      localStorage.setItem('calendarEditMode', JSON.stringify(true));
      localStorage.setItem('calendarEditModeTimestamp', Date.now().toString());
    } else {
      localStorage.removeItem('calendarEditMode');
      localStorage.removeItem('calendarEditModeTimestamp');
    }
  }, [editMode]);
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode((prev: boolean) => !prev);
  };

  // Load events from localStorage on mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      // Add sample events
      const sampleEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Delivery Route KL-01',
          start: new Date().toISOString().split('T')[0] + 'T09:00:00',
          end: new Date().toISOString().split('T')[0] + 'T12:00:00',
          description: 'Morning delivery route to Kuala Lumpur',
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
        },
        {
          id: '2',
          title: 'Delivery Route JB-02',
          start: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T14:00:00',
          end: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T17:00:00',
          description: 'Afternoon delivery to Johor Bahru',
          backgroundColor: '#10b981',
          borderColor: '#059669',
        },
      ];
      setEvents(sampleEvents);
      localStorage.setItem('calendarEvents', JSON.stringify(sampleEvents));
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('calendarEvents', JSON.stringify(events));
    }
  }, [events]);

  const handleDateClick = (info: any) => {
    // Check if there are events on this date
    const dateStr = info.dateStr;
    const eventsOnDate = events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === dateStr;
    });

    // If there are multiple events and not in edit mode, show popover
    if (eventsOnDate.length > 0 && !editMode) {
      const date = new Date(dateStr);
      setSelectedDateEvents(eventsOnDate);
      setSelectedDateInfo({
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      });
      setShowEventsPopover(true);
      return;
    }
    
    // Only allow adding events in edit mode
    if (!editMode) return;
    
    setSelectedEvent(null);
    setEventTitle("");
    setEventStart(info.dateStr + 'T09:00');
    setEventEnd(info.dateStr + 'T10:00');
    setEventDescription("");
    setShowEventDialog(true);
  };

  const handleEventClick = (info: any) => {
    // Only allow editing events in edit mode
    if (!editMode) return;
    
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setEventTitle(event.title);
      setEventStart(event.start);
      setEventEnd(event.end || '');
      setEventDescription(event.description || '');
      setShowEventDialog(true);
    }
  };

  const handleSaveEvent = () => {
    if (!eventTitle.trim()) {
      toast({
        title: "Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedEvent) {
      // Update existing event
      setEvents(events.map(e => 
        e.id === selectedEvent.id 
          ? { ...e, title: eventTitle, start: eventStart, end: eventEnd, description: eventDescription }
          : e
      ));
      toast({
        title: "Event Updated",
        description: "Your event has been updated successfully",
      });
    } else {
      // Create new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStart,
        end: eventEnd,
        description: eventDescription,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
      };
      setEvents([...events, newEvent]);
      toast({
        title: "Event Created",
        description: "Your event has been added to the calendar",
      });
    }

    setShowEventDialog(false);
    resetForm();
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      setEvents(events.filter(e => e.id !== selectedEvent.id));
      toast({
        title: "Event Deleted",
        description: "The event has been removed from the calendar",
      });
      setShowEventDialog(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setEventTitle("");
    setEventStart("");
    setEventEnd("");
    setEventDescription("");
  };

  return (
    <>
      <style>{`
        /* FullCalendar Base Styles */
        .fc {
          font-family: inherit;
        }
        
        .fc table {
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .fc-theme-standard td,
        .fc-theme-standard th {
          border: 1px solid #e5e7eb;
        }
        
        .fc-scrollgrid {
          border: 1px solid #e5e7eb;
        }
        
        .fc-col-header-cell {
          font-weight: 600;
          padding: 8px 4px;
          color: #28282B;
        }
        
        .fc-daygrid-day {
          padding: 4px;
        }
        
        .fc-daygrid-day-number {
          padding: 4px;
          color: #28282B;
        }
        
        .fc-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 12px;
        }
        
        .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #28282B;
        }
        
        .fc-button {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-transform: capitalize;
          color: #28282B;
        }
        
        .fc-button-primary {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .fc-button-primary:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        
        .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }
        
        .fc-day-today {
          background-color: rgba(59, 130, 246, 0.05);
        }
        
        /* Dark mode calendar styling */
        .dark .fc {
          --fc-border-color: rgba(255, 255, 255, 0.1);
          --fc-page-bg-color: transparent;
          color: #d1d5db;
        }
        
        .dark .fc-theme-standard td,
        .dark .fc-theme-standard th {
          border-color: rgba(255, 255, 255, 0.08);
        }
        
        .dark .fc-scrollgrid {
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .dark .fc-col-header-cell {
          background-color: rgba(17, 24, 39, 0.8);
          color: #9ca3af;
        }
        
        .dark .fc-daygrid-day {
          background-color: rgba(31, 41, 55, 0.6);
        }
        
        .dark .fc-daygrid-day-number {
          color: #d1d5db;
        }
        
        .dark .fc-day-today {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        
        .dark .fc-button-primary {
          background-color: rgba(59, 130, 246, 0.8);
          border-color: rgba(59, 130, 246, 0.5);
        }
        
        .dark .fc-button-primary:hover {
          background-color: rgba(37, 99, 235, 0.9);
        }
        
        .dark .fc-button-primary:not(:disabled).fc-button-active {
          background-color: rgba(29, 78, 216, 1);
        }
        
        .dark .fc-toolbar-title {
          color: #f3f4f6;
        }
      `}</style>

      {/* Simple Header with Back and Theme Buttons */}
      <nav className="fixed top-0 left-0 right-0 z-[100] w-full border-b-2 border-blue-500/50 dark:border-blue-400/50 bg-white dark:bg-black shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between text-[12px]">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
                  <img 
                    src="/assets/FamilyMart.png" 
                    alt="Logo" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-600 dark:text-slate-300" style={{ fontSize: '12px' }}>Calendar</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Schedule & Events</span>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {/* Edit Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEditMode}
                className={`btn-glass w-auto px-3 h-8 pagination-button rounded-xl group transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg active:scale-95 active:shadow-none ${
                  editMode 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 hover:shadow-blue-500/30' 
                    : 'hover:shadow-gray-500/20'
                }`}
                title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
              >
                {editMode ? (
                  <>
                    <Edit className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Exit Edit</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Edit</span>
                  </>
                )}
              </Button>
              
              {/* Theme Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
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
              
              {/* Back Button */}
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                size="sm"
                className="btn-glass w-8 h-8 p-0 pagination-button rounded-xl group transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 active:shadow-none"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 transition-all duration-300" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="bg-white dark:bg-black animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top) + 2rem)', paddingBottom: '2rem' }}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">


          {/* Calendar */}
          <div className="relative">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable={editMode}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={2}
              dayMaxEventRows={2}
              moreLinkText={(num) => `+${num} more`}
              height="auto"
              eventMouseEnter={(info) => {
                if (!editMode) {
                  const event = events.find(e => e.id === info.event.id);
                  if (event) {
                    const rect = info.el.getBoundingClientRect();
                    setTooltipEvent(event);
                    setTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10
                    });
                    setShowTooltip(true);
                  }
                }
              }}
              eventMouseLeave={() => {
                if (!editMode) {
                  setShowTooltip(false);
                }
              }}
              eventDrop={(info) => {
                const updatedEvent = events.find(e => e.id === info.event.id);
                if (updatedEvent) {
                  setEvents(events.map(e => 
                    e.id === info.event.id
                      ? { ...e, start: info.event.start?.toISOString() || e.start, end: info.event.end?.toISOString() || e.end }
                      : e
                  ));
                }
              }}
              eventResize={(info) => {
                const updatedEvent = events.find(e => e.id === info.event.id);
                if (updatedEvent) {
                  setEvents(events.map(e => 
                    e.id === info.event.id
                      ? { ...e, start: info.event.start?.toISOString() || e.start, end: info.event.end?.toISOString() || e.end }
                      : e
                  ));
                }
              }}
            />
            
            {/* Custom Tooltip */}
            {showTooltip && tooltipEvent && (
              <div 
                className="fixed z-[9999] pointer-events-none"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-2 border-gray-200/60 dark:border-white/10 rounded-2xl p-4 shadow-2xl max-w-[320px] animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-[#28282B] dark:text-[#E5E4E2] mb-2">
                        {tooltipEvent.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#28282B]/70 dark:text-[#E5E4E2]/70">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(tooltipEvent.start).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                        {tooltipEvent.end && ` - ${new Date(tooltipEvent.end).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}`}
                      </span>
                    </div>
                    {tooltipEvent.description && (
                      <div className="text-sm text-[#28282B]/70 dark:text-[#E5E4E2]/70 mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                        {tooltipEvent.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 rounded-3xl text-[#28282B] dark:text-[#E5E4E2]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-[#28282B] dark:text-[#E5E4E2]">
              {selectedEvent ? (
                <>
                  <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Edit Event
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Create New Event
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title" className="text-[#28282B] dark:text-[#E5E4E2]">Event Title *</Label>
              <Input
                id="event-title"
                placeholder="Enter event title..."
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="bg-white/50 dark:bg-black/50 text-[#28282B] dark:text-[#E5E4E2] placeholder:text-[#28282B]/50 dark:placeholder:text-[#E5E4E2]/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start" className="text-[#28282B] dark:text-[#E5E4E2]">Start Date & Time *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="bg-white/50 dark:bg-black/50 text-[#28282B] dark:text-[#E5E4E2]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-end" className="text-[#28282B] dark:text-[#E5E4E2]">End Date & Time</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="bg-white/50 dark:bg-black/50 text-[#28282B] dark:text-[#E5E4E2]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description" className="text-[#28282B] dark:text-[#E5E4E2]">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Add event details..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={4}
                className="bg-white/50 dark:bg-black/50 text-[#28282B] dark:text-[#E5E4E2] placeholder:text-[#28282B]/50 dark:placeholder:text-[#E5E4E2]/50"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {selectedEvent && (
              <Button
                variant="destructive"
                onClick={handleDeleteEvent}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowEventDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              {selectedEvent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multiple Events Popover */}
      <Dialog open={showEventsPopover} onOpenChange={setShowEventsPopover}>
        <DialogContent className="sm:max-w-[500px] bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 rounded-3xl text-[#28282B] dark:text-[#E5E4E2]">
          <DialogHeader>
            {selectedDateInfo && (
              <div className="text-center space-y-1 pb-4 border-b border-gray-200 dark:border-white/10">
                <DialogTitle className="text-2xl font-bold text-[#28282B] dark:text-[#E5E4E2]">
                  {selectedDateInfo.day}
                </DialogTitle>
                <p className="text-sm text-[#28282B]/70 dark:text-[#E5E4E2]/70">
                  {selectedDateInfo.date}
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <p className="text-center text-[#28282B]/50 dark:text-[#E5E4E2]/50 py-8">
                No events on this day
              </p>
            ) : (
              selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-white/10 hover:bg-white/70 dark:hover:bg-black/70 transition-all"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-[#28282B] dark:text-[#E5E4E2] truncate">
                        {event.title}
                      </h4>
                      {editMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => {
                            setShowEventsPopover(false);
                            setSelectedEvent(event);
                            setEventTitle(event.title);
                            setEventStart(event.start);
                            setEventEnd(event.end || '');
                            setEventDescription(event.description || '');
                            setShowEventDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-[#28282B]/70 dark:text-[#E5E4E2]/70 mt-1">
                      <span className="font-medium">
                        {new Date(event.start).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </span>
                      {event.end && (
                        <>
                          <span>-</span>
                          <span className="font-medium">
                            {new Date(event.end).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-[#28282B]/60 dark:text-[#E5E4E2]/60 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEventsPopover(false)}
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer editMode={editMode} showFloatingDock={showFloatingDock} />
    </>
  );
}
