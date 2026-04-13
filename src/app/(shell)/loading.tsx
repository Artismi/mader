export default function ShellLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">
          Caricamento
        </span>
      </div>
    </div>
  )
}
