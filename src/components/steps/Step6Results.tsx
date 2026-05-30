"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowLeft, RefreshCw, BarChart, TrendingUp, DollarSign, Truck, ShieldAlert, ShieldCheck } from "lucide-react";
import ResultDisplay from "../ResultDisplay";

export default function Step6Results() {
	const { state, prevStep, reset } = useCalculator();
	const data = state.apiData || state.xmlData;

	if (!data) return null;

	// Filter data based on selected eraldised
	const filteredDetails = data.details.filter(d => state.selectedEraldised.includes(d.eraldisId));
	const filteredTotal = filteredDetails.reduce((sum, d) => sum + d.value, 0);

	const filteredData = {
		...data,
		eraldisteArv: filteredDetails.length,
		totalValue: filteredTotal,
		details: filteredDetails
	};

	const costs = state.costs;

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("et-EE", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(val);
	};

	return (
		<div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 w-full max-w-4xl mx-auto">
			
			<div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
				<div className="flex items-center gap-3">
					<div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
						<BarChart size={28} />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-slate-900">Lõpptulemus</h2>
						<p className="text-slate-500 text-sm mt-1">Koondaruanne valitud eraldiste väärtuse ja kalkuleeritud kulude kohta</p>
					</div>
				</div>
			</div>

			{/* ESTHub Satelliitauditi Turvaaruandlus (Security Audit Banner) */}
			{state.satelliteAuditPeriod === 'active' && data.avertedLoss && data.avertedLoss > 0 ? (
				<div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-red-100 rounded-xl text-red-700 shrink-0">
							<ShieldAlert size={28} />
						</div>
						<div>
							<h3 className="text-lg font-bold text-red-950 mb-1">
								Hoiatus: Metsaregistri andmed olid aegunud!
							</h3>
							<p className="text-red-800 text-sm leading-relaxed max-w-xl font-medium">
								Satelliitkontroll tuvastas, et mõni teie valitud metsasektor on hiljuti läbinud raietööd (lageraie/harvendus). Satelliitseire süsteem Sentinel-2 vähendas automaatselt puidu väärtust, hoides ära aegunud andmetel põhineva ülemaksmise.
							</p>
							<span className="inline-block mt-2 text-xs font-bold text-red-700 bg-red-100/50 px-2.5 py-1 rounded-full border border-red-200">
								Sentinel-2 Satelliidiaudit • Tuvastatud lageraie
							</span>
						</div>
					</div>
					
					<div className="bg-white border border-red-200 rounded-xl p-4 flex flex-col items-center md:items-end justify-center shrink-0 min-w-[180px] shadow-sm">
						<span className="text-[10px] uppercase font-bold tracking-wider text-red-500 mb-1">Säästetud kahju</span>
						<span className="text-3xl font-black text-red-600 font-mono">
							{formatCurrency(data.avertedLoss)}
						</span>
						<span className="text-[10px] text-slate-400 mt-1 font-medium">Auditi tehingukaitse</span>
					</div>
				</div>
			) : state.satelliteAuditPeriod === 'active' ? (
				<div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
					<div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
						<ShieldCheck size={28} />
					</div>
					<div>
						<h3 className="text-lg font-bold text-emerald-950 mb-1">
							Metsa seisukord satelliidilt kinnitatud!
						</h3>
						<p className="text-emerald-800 text-sm leading-relaxed max-w-xl font-medium">
							ESTHub Sentinel-2 satelliidi vegetatsiooni audit skaneeris metsaalad. Kõik eraldised vastavad täielikult registri biomassi ootustele (klorofülli tase tervislik).
						</p>
						<span className="inline-block mt-2 text-xs font-bold text-emerald-700 bg-emerald-100/50 px-2.5 py-1 rounded-full border border-emerald-200">
							ESTHub Taimkatte Audit • Roheline staatus (Kõik korras)
						</span>
					</div>
				</div>
			) : (
				<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
					<div className="p-3 bg-amber-100 rounded-xl text-amber-700 shrink-0">
						<ShieldAlert size={28} />
					</div>
					<div>
						<h3 className="text-lg font-bold text-amber-950 mb-1">
							Tähelepanu: Satelliidiaudit puudub!
						</h3>
						<p className="text-amber-800 text-sm leading-relaxed max-w-xl font-medium">
							Andmed põhinevad ainult Metsaregistri ajaloolisel kirjeldusel. Kuna metsa võidi vahepeal raiuda, soovitame alati seadistada satelliidiaudit seire sammus.
						</p>
					</div>
				</div>
			)}

			{/* Financial Dashboard Card (Bruto vs Neto) */}
			{costs && (
				<div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
					{/* Deco luminous orb */}
					<div className="absolute top-[-50%] right-[-20%] w-[60%] h-[120%] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
					
					<div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
						<div className="md:col-span-6 flex flex-col justify-center text-center md:text-left border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8">
							<span className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 block">
								Puidu puhasmüük (Käes)
							</span>
							<h3 className="text-5xl md:text-6xl font-black text-white tracking-tight bg-clip-text">
								{formatCurrency(costs.netValue)}
							</h3>
							<p className="text-slate-400 text-sm mt-3 leading-relaxed">
								Kalkuleeritud puhastulu pärast raie-, veo- ja logistikakulude mahaarvamist.
							</p>
						</div>

						<div className="md:col-span-6 grid grid-cols-2 gap-4">
							<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Metsa brutoväärtus</span>
								<span className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(costs.grossValue)}</span>
							</div>
							<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Logistikakulud kokku</span>
								<span className="text-xl font-bold text-red-400 font-mono">{formatCurrency(costs.totalCosts)}</span>
							</div>
							<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Raie kokkumaht</span>
								<span className="text-xl font-bold text-slate-100 font-mono">{costs.totalVolume.toFixed(1)} tm</span>
							</div>
							<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Üldine tasuvus</span>
								<span className="text-xl font-bold text-slate-100 font-mono">
									{costs.grossValue > 0 ? `${((costs.netValue / costs.grossValue) * 100).toFixed(0)}%` : "0%"}
								</span>
							</div>
						</div>
					</div>

					{/* Itemized cost collapse description */}
					<div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs text-slate-400">
						<div>
							<span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">Raie (Harvester)</span>
							<span className="font-semibold text-slate-300 font-mono">{formatCurrency(costs.fellingCost)}</span>
						</div>
						<div>
							<span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">Metsavedu (Forwarder)</span>
							<span className="font-semibold text-slate-300 font-mono">{formatCurrency(costs.forwardingCost)}</span>
						</div>
					</div>
				</div>
			)}

			{/* Detailed stand valuation elements */}
			<ResultDisplay data={filteredData} />

			{/* Bottom navigation and control */}
			<div className="flex justify-between mt-4">
				<button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
					<ArrowLeft size={18} /> Tagasi
				</button>
				<button onClick={reset} className="px-8 py-3 rounded-xl font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
					<RefreshCw size={18} /> Alusta Uuesti
				</button>
			</div>
		</div>
	);
}
