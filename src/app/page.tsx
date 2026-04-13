import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { NuovoTaskModal } from "@/components/ui/nuovo-task-modal";
import { WeeklyCalendar } from "@/components/ui/weekly-calendar";
import { FocusList } from "@/components/ui/focus-list";
import { PlannerWidget } from "@/components/ui/planner-widget";
import { AvailabilityPanel } from "@/components/ui/availability-panel";
import { tasks, tokens, bookings, availabilitySlots } from "@/lib/db";

export default async function DailyBriefingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const toComponentTask = (t: ReturnType<typeof tasks.getOverdue>[0]) => ({
    ...t,
    clients: t.client_name ? { name: t.client_name } : null,
    category: t.category as 'task' | 'engagement',
  })

  // Increased limits for a more comprehensive briefing
  const urgentTasks = tasks.getOverdue(10).map(toComponentTask) as any[];
  const suggestedTasks = tasks.getUpcoming(10).map(toComponentTask) as any[];
  const allTasksForCalendar = tasks.getAll({ status: 'todo' }).map(toComponentTask) as any[];

  // Token Google & Events
  let calendarEvents: any[] = [];
  const tokenData = tokens.get('google');

  if (tokenData?.provider_token) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      oauth2Client.setCredentials({
        access_token: tokenData.provider_token,
        refresh_token: tokenData.provider_refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 28); // 4 weeks lookahead (Agenda unified)
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 150,
        singleEvents: true,
        orderBy: 'startTime',
      });
      calendarEvents = res.data.items || [];
    } catch (e: any) {
      console.warn("Google Calendar sync error (ignoring):", e.message || "Invalid credentials");
    }
  }

  // Bookings (Calendly) -> Eventi shape
  const upcomingBookings = bookings.getUpcoming();
  const bookingEvents = upcomingBookings.map(b => ({
    id: `booking-${b.id}`,
    summary: `📅 ${b.title || 'App.'} — ${b.attendee_name}`,
    start: { dateTime: b.start_time },
    end: { dateTime: b.end_time },
    _isBooking: true,
  }));

  const allEventsCombined = [...calendarEvents, ...bookingEvents];
  const slots = availabilitySlots.getAll();

  const dateLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">

      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#090909]">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-black tracking-tight text-white/90 underline decoration-violet-500/50 decoration-2 underline-offset-4">Oggi.</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 hidden sm:block">
            {dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NuovaIdeaModal />
          <NuovoTaskModal />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        
        {/* Availability Panel integrated in the home context */}
        <AvailabilityPanel initialSlots={slots} />

        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-white/5 overflow-y-auto scrollbar-hide px-5 py-5 gap-8 bg-[#090909]/40 backdrop-blur-sm">
          <FocusList urgentTasks={urgentTasks} suggestedTasks={suggestedTasks} />
          <div className="border-t border-white/5 pt-6">
            <PlannerWidget />
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-hidden">
          <div className="h-full w-full p-4 relative">
             <WeeklyCalendar 
               initialEvents={allEventsCombined} 
               initialTasks={allTasksForCalendar} 
               initialAvailability={slots}
             />
          </div>
        </main>

      </div>
    </div>
  );
}
