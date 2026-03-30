import { CheckCircle2, Clock, Calendar as CalendarIcon, Plus, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { Button } from "@/components/ui/button";
import { AIChatWidget } from "@/components/ui/ai-chat-widget";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { NuovoTaskModal } from "@/components/ui/nuovo-task-modal";
import { WeeklyCalendar } from "@/components/ui/weekly-calendar";
import { PlannerWidget } from "@/components/ui/planner-widget";

export default async function DailyBriefingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let urgentTasks: any[] = [];
  let suggestedTasks: any[] = [];
  let calendarEvents: any[] = [];
  let allTasksForCalendar: any[] = [];

  if (user) {
    const todayStr = new Date().toISOString();
    
    // 1. Fetch Tasks for Briefing (Limits remain for focus)
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

    // 2. Fetch ALL upcoming tasks for the weekly calendar
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'todo')
      .gte('deadline', todayStr)
      .order('deadline', { ascending: true });
    
    allTasksForCalendar = allTasks || [];

    // 3. Fetch Google Calendar Events (Next 7 days)
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
        timeMax.setDate(timeMax.getDate() + 7); // Settimana intera
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

  const allRelevantBriefingTasks = urgentTasks.length + suggestedTasks.length;

  return (
    <div className="w-full max-w-[1600px] mx-auto pt-24 pb-32 px-6 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: AI Co-Pilot (Span 3) */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <div className="flex items-center gap-3 ml-2">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
             <span className="text-xs font-bold tracking-widest uppercase text-white/40">Co-Pilot Attivo</span>
          </div>
          <AIChatWidget />
        </div>

        {/* Center Column: The Briefing Sheet (Span 6) */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="paper-sheet p-8 md:p-12 transition-all">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-primary">Buongiorno.</h1>
                <p className="mt-3 text-[10px] md:text-xs text-primary/40 font-bold uppercase tracking-[0.2em]">
                  {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex gap-2">
                 <NuovaIdeaModal />
                 <NuovoTaskModal />
              </div>
            </div>

            <div className="space-y-12">
              {/* Summary */}
              <div className="p-8 bg-black/[0.02] rounded-2xl border border-black/[0.05] relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-accent/40" />
                 <p className="text-xl text-primary/80 leading-relaxed font-serif italic">
                   "Oggi hai <span className="font-bold text-accent">{allRelevantBriefingTasks}</span> priorità critiche. La tua settimana è pianificata, scorri in basso per i dettagli orari."
                 </p>
              </div>

              {/* Briefing Grid Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/20 mb-6 flex items-center">
                      <Clock className="w-4 h-4 mr-2" /> In Ritardo
                    </h2>
                    <div className="space-y-5">
                      {urgentTasks.length === 0 ? (
                        <div className="text-sm text-primary/20 italic font-medium">Nessuna urgenza rilevata.</div>
                      ) : (
                        urgentTasks.map(task => (
                          <div key={task.id} className="group cursor-pointer">
                            <h3 className="text-sm font-bold text-primary group-hover:text-accent transition-colors leading-tight">{task.title}</h3>
                            <p className="text-[10px] font-bold text-primary/40 mt-1 uppercase tracking-wider">{task.clients?.name}</p>
                          </div>
                        ))
                      )}
                    </div>
                 </section>

                 <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/20 mb-6 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Prossimi Task
                    </h2>
                    <div className="space-y-5">
                      {suggestedTasks.length === 0 ? (
                        <div className="text-sm text-primary/20 italic font-medium">Playlist completata.</div>
                      ) : (
                        suggestedTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-4 group cursor-pointer">
                            <div className="w-5 h-5 rounded-full border-2 border-primary/10 flex items-center justify-center group-hover:border-accent transition-colors" />
                            <span className="text-sm font-bold text-primary/70 group-hover:text-primary transition-colors">{task.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                 </section>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summaries & Quick Access (Span 3) */}
        <div className="lg:col-span-3 space-y-8 order-3 lg:order-3">
          {/* Quick Stats */}
          <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center">
              <LayoutGrid className="w-4 h-4 mr-2" /> Panoramica
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Task</p>
                    <p className="text-2xl font-black mt-1">{allTasksForCalendar.length}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Eventi</p>
                    <p className="text-2xl font-black mt-1">{calendarEvents.length}</p>
                </div>
            </div>
          </div>

          <PlannerWidget />
        </div>
        </div>
      </div>

      {/* Full Width Bottom Section: Weekly Calendar (Separated) */}
      <section className="pt-24 pb-20 border-t border-white/5">
         <div className="flex items-center gap-3 mb-10 ml-4">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Agenda Operativa</h2>
         </div>
         <WeeklyCalendar initialEvents={calendarEvents} initialTasks={allTasksForCalendar} />
      </section>
    </div>
  )
}
