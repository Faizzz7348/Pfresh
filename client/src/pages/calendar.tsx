import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useTheme } from "@/components/theme-provider";
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
import { Calendar as CalendarIcon, Plus, Edit, Trash2 } from "lucide-react";

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventDescription, setEventDescription] = useState("");

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
      <div className="animate-in fade-in duration-500">
        <Navigation 
          editMode={false}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      <main className="pt-16 pb-8 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
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

          {/* Calendar Card */}
          <Card className="p-6 glass-card border-none shadow-2xl rounded-2xl">
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
          </Card>
        </div>
      </main>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
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
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                placeholder="Enter event title..."
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start Date & Time *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="bg-white/50 dark:bg-black/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-end">End Date & Time</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="bg-white/50 dark:bg-black/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Add event details..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={4}
                className="bg-white/50 dark:bg-black/50"
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

      <Footer editMode={false} />
    </>
  );
}
