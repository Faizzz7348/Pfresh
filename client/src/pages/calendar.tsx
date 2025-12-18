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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ArrowLeft, Sun, Moon } from "lucide-react";

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
    setSelectedEvent(null);
    setEventTitle("");
    setEventStart(info.dateStr + 'T09:00');
    setEventEnd(info.dateStr + 'T10:00');
    setEventDescription("");
    setShowEventDialog(true);
  };

  const handleEventClick = (info: any) => {
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
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl">
                  <CalendarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    Delivery Calendar
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Schedule and manage your delivery routes
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedEvent(null);
                  setEventTitle("");
                  setEventStart(new Date().toISOString().slice(0, 16));
                  setEventEnd(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                  setEventDescription("");
                  setShowEventDialog(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>

          {/* Calendar */}
          <div>
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
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              height="auto"
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

      <Footer editMode={false} showFloatingDock={showFloatingDock} />
    </>
  );
}
