import { tasks } from '@/lib/db'
import { OverlayWidget } from '@/components/ui/overlay-widget'

export default function OverlayPage() {
  const todoTasks = tasks.getAll({ status: 'todo' }).slice(0, 20)
  return <OverlayWidget initialTasks={todoTasks} />
}
