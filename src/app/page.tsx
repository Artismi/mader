import { CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { NuovoTaskModal } from "@/components/ui/nuovo-task-modal";
import { WeeklyCalendar } from "@/components/ui/weekly-calendar";
import { ToolPanels } from "@/components/ui/tool-panels";

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
      .limit(4);

    urgentTasks = overdue || [];

    const { data: upcoming } = await supabase
      .from('tasks')
      .select(`*, clients(name)`)
      .eq('status', 'todo')
      .eq('category', 'task')
      .gte('deadline', todayStr)
      .order('deadline', { ascending: true })
      .limit(4);

    suggestedTasks = upcoming || [];

    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
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
        timeMax.setDate(timeMax.getDate() + 7);
        const res = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          timeMax: timeMax.toISOString(),
          maxResults: 50,
          singleEvents: true,
          orderBy: 'startTime',
        });
        calendarEvents = res.data.items || [];
      } catch (e) {
        console.error("Error fetching calendar", e);
      }
    }
  }

  const dateLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 pt-24 pb-32">

      {/* LAYER 1 — ANCHOR */}
      <div className="flex items-end justify-between pb-8 border-b border-white/5 mb-10">
        <div>
          <h1 className="text-5xl font-black tracking-tighter">Buongiorno.</h1>
          <p className="text-[11px] text-white/25 font-bold uppercase tracking-[0.3em] mt-2">
            {dateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NuovaIdeaModal />
          <NuovoTaskModal />
        </div>
      </div>

      {/* LAYER 2 — FOCUS + AGENDA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* Focus List */}
        <div className="lg:col-span-4 space-y-10 pt-1">

          <p className="text-sm text-white/30 italic leading-relaxed">
            {urgentTasks.length === 0 && suggestedTasks.length === 0
              ? "Nessuna priorità attiva."
              : urgentTasks.length > 0
                ? `${urgentTasks.length} ${urgentTasks.length === 1 ? 'task in ritardo' : 'task in ritardo'} · ${suggestedTasks.length} in arrivo.`
                : `${suggestedTasks.length} task in arrivo.`
            }
          </p>

          {urgentTasks.length > 0 && (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400/50 mb-5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> In Ritardo
              </h2>
              <div className="space-y-5">
                {urgentTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 group cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 mt-[7px] shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-white/70 group-hover:text-white transition-colors leading-snug">
                        {task.title}
                      </h3>
                      {task.clients?.name && (
                        <p className="text-[10px] font-bold text-white/20 mt-0.5 uppercase tracking-wider">
                          {task.clients.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {suggestedTasks.length > 0 && (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 mb-5 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Prossimi
              </h2>
              <div className="space-y-4">
                {suggestedTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 group cursor-pointer">
                    <div className="w-4 h-4 rounded-full border border-white/12 group-hover:border-accent/40 transition-colors shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-white/45 group-hover:text-white/75 transition-colors leading-snug">
                        {task.title}
                      </span>
                      {task.clients?.name && (
                        <p className="text-[10px] font-bold text-white/15 mt-0.5 uppercase tracking-wider">
                          {task.clients.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {urgentTasks.length === 0 && suggestedTasks.length === 0 && (
            <p className="text-xs text-white/15 italic">
              Aggiungi un task per iniziare.
            </p>
          )}
        </div>

        {/* Weekly Calendar */}
        <div className="lg:col-span-8">
          <WeeklyCalendar initialEvents={calendarEvents} initialTasks={allTasksForCalendar} />
        </div>
      </div>

      {/* LAYER 3 — STRUMENTI */}
      <ToolPanels />
    </div>
  )
}
