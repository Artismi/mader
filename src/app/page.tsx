import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { NuovoTaskModal } from "@/components/ui/nuovo-task-modal";
import { WeeklyCalendar } from "@/components/ui/weekly-calendar";
import { FocusList } from "@/components/ui/focus-list";
import { PlannerWidget } from "@/components/ui/planner-widget";
import { GmailWidget } from "@/components/ui/gmail-widget";
import { Mail } from "lucide-react";

export default async function DailyBriefingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let urgentTasks: any[] = [];
  let suggestedTasks: any[] = [];
  let calendarEvents: any[] = [];
  let allTasksForCalendar: any[] = [];

  if (user) {
    const todayStr = new Date().toISOString();

    const { data: overdue } = await supabase
      .from('tasks')
      .select(`*, clients(name)`)
      .eq('status', 'todo')
      .eq('category', 'task')
      .lt('deadline', todayStr)
      .order('deadline', { ascending: true })
      .limit(5);

    urgentTasks = overdue || [];

    const { data: upcoming } = await supabase
      .from('tasks')
      .select(`*, clients(name)`)
      .eq('status', 'todo')
      .eq('category', 'task')
      .gte('deadline', todayStr)
      .order('deadline', { ascending: true })
      .limit(5);

    suggestedTasks = upcoming || [];

    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*, clients(name)')
      .eq('status', 'todo')
      .gte('deadline', todayStr)
      .order('deadline', { ascending: true });

    allTasksForCalendar = allTasks || [];

    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('provider_token')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (tokenData?.provider_token) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: tokenData.provider_token });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      try {
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 14);
        const res = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          timeMax: timeMax.toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
        });
        calendarEvents = res.data.items || [];
      } catch (e) {
        console.error("Calendar fetch error", e);
      }
    }
  }

  const dateLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    // Full-viewport layout — no page scroll
    <div className="h-screen overflow-hidden flex flex-col pt-16">

      {/* Top bar — compatto */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-black tracking-tight text-white/90">Buongiorno.</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/20 hidden sm:block">
            {dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NuovaIdeaModal />
          <NuovoTaskModal />
        </div>
      </div>

      {/* Main area — due colonne indipendenti */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Sidebar sinistra — scrollabile indipendentemente */}
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-white/[0.05] overflow-y-auto scrollbar-hide px-5 py-5 gap-8">
          <FocusList urgentTasks={urgentTasks} suggestedTasks={suggestedTasks} />

          {/* Gmail inbox */}
          <div className="border-t border-white/5 pt-6 space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> Inbox
            </h2>
            <GmailWidget />
          </div>

          <div className="border-t border-white/5 pt-6">
            <PlannerWidget />
          </div>
        </aside>

        {/* Calendario — occupa tutto lo spazio restante */}
        <main className="flex-1 min-w-0 overflow-hidden p-4">
          <WeeklyCalendar initialEvents={calendarEvents} initialTasks={allTasksForCalendar} />
        </main>

      </div>
    </div>
  );
}
