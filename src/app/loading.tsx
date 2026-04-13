export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#090909]">
      <div className="relative flex flex-col items-center">
        {/* Cerchio pulsante e logo animato per un feel premium */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="h-32 w-32 animate-ping rounded-full bg-violet-600/20 blur-xl duration-[3000ms]"></div>
        </div>
        
        <div className="z-10 flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 p-[1px] shadow-2xl backdrop-blur-md">
          <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-[#090909]/90">
            <div className="h-6 w-6 rounded-full border-2 border-violet-500/50 border-t-violet-400 border-r-fuchsia-400 animate-spin"></div>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-white/40 animate-pulse">
          Caricamento...
        </h2>
      </div>
    </div>
  );
}
