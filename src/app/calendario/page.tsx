import { redirect } from 'next/navigation'

// Il calendario vive nella dashboard (WeeklyCalendar in /): i link di navigazione puntano qui
export default function CalendarioPage() {
  redirect('/')
}
