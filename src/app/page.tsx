import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { NuovoTaskModal } from "@/components/ui/nuovo-task-modal";
import { WeeklyCalendar } from "@/components/ui/weekly-calendar";
import { FocusList } from "@/components/ui/focus-list";
import { PlannerWidget } from "@/components/ui/planner-widget";
import { AvailabilityPanel } from "@/components/ui/availability-panel";
import { tasks, availabilitySlots } from "@/lib/db";

export default function DailyBriefingPage() {
  const toComponentTask = (t: ReturnType<typeof tasks.getOverdue>[0]) => ({
    ...t,
    clients: t.client_name ? { name: t.client_name } : null,
    category: t.category as 'task' | 'engagement',
  })

  const urgentTasks   = tasks.getOverdue(10).map(toComponentTask) as any[]
  const suggestedTasks = tasks.getUpcoming(10).map(toComponentTask) as any[]
  const allTasksForCalendar = tasks.getAll({ status: 'todo' }).map(toComponentTask) as any[]
  const slots = availabilitySlots.getAll()

  const dateLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

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

        <AvailabilityPanel initialSlots={slots} />

        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-white/5 overflow-y-auto scrollbar-hide px-5 py-5 gap-8 bg-[#090909]/40 backdrop-blur-sm">
          <FocusList urgentTasks={urgentTasks} suggestedTasks={suggestedTasks} />
          <div className="border-t border-white/5 pt-6">
            <PlannerWidget />
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-hidden">
          <div className="h-full w-full p-4 relative">
            {/* WeeklyCalendar carica gli eventi Google Calendar client-side via /api/calendar/events */}
            <WeeklyCalendar
              initialEvents={[]}
              initialTasks={allTasksForCalendar}
              initialAvailability={slots}
              fetchEventsUrl="/api/calendar/events"
            />
          </div>
        </main>

      </div>
    </div>
  )
}
