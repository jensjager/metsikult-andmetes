import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">
      
      {/* Tausta dekoor element - helendav orb */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-forest-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-forest-700/20 blur-[100px] pointer-events-none" />

      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        
        <div className="text-center mb-12 animate-in slide-in-from-top-8 duration-700 fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-500/10 text-forest-400 border border-forest-500/20 text-sm font-semibold tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-forest-500 animate-pulse" />
            LIVE METSAREGISTRI ÜHENDUS
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
            Metsakalkulaator<span className="text-forest-500">.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-medium">
            Avasta oma metsa väärtus paari klikiga. Meie intelligentne süsteem analüüsib eraldiste andmeid ja teeb täpseid prognoose.
          </p>
        </div>

        <CalculatorForm />
        
      </div>
    </main>
  );
}
