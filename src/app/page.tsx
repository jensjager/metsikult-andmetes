import WizardContainer from "@/components/WizardContainer";
import { CalculatorProvider } from "@/lib/CalculatorContext";

export default function Home() {
	return (
		<CalculatorProvider>
			<main className="min-h-screen flex flex-col items-center p-6 md:p-12 relative overflow-hidden">
				{/* Tausta dekoor element - helendav orb */}
				<div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-400/20 blur-[120px] pointer-events-none" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cta-400/20 blur-[100px] pointer-events-none" />

				<div className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-8">
					<div className="text-center mb-12 animate-in slide-in-from-top-8 duration-700 fade-in">
						<h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-primary-900 leading-tight">
							Metsakalkulaator<span className="text-cta-500">.</span>
						</h1>
						<p className="text-lg md:text-xl text-primary-800/80 max-w-2xl mx-auto font-medium leading-relaxed">
							Erapooletu metsahindamine, kontrolli metsahinda.
						</p>
					</div>

					<WizardContainer />
				</div>
			</main>
		</CalculatorProvider>
	);
}
