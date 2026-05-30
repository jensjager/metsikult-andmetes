"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowRight, ArrowLeft, TrendingDown, Info, DollarSign, ShieldAlert } from "lucide-react";
import React, { useEffect } from "react";

export default function Step5Costs() {
	const { state, setCosts, nextStep, prevStep } = useCalculator();
	const data = state.apiData || state.xmlData;

	const harvestType: string = "lageraie";
	const terrainDifficulty: string = "medium";
	const transportDistance = 60;

	if (!data) return null;

	// 1. Calculate felling volume (in tihumeetrid / tm)
	const selectedStands = data.details.filter((d: any) => state.selectedEraldised.includes(d.eraldisId));
	
	const totalVolume = selectedStands.reduce((sum: number, stand: any) => {
		if (stand.elemendid && stand.elemendid.length > 0) {
			return sum + stand.elemendid.reduce((s: number, el: any) => s + (el.tagavara_absoluutne || 0), 0);
		}
		const pindala = stand.pindala || 0;
		const tagavaraHa = stand.meta?.tagavara_y_ha || stand.meta?.tagavara_1_ha || 0;
		return sum + (tagavaraHa * pindala);
	}, 0);

	// Gross forest stand value
	const grossValue = selectedStands.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

	// Get logistics info from Step 4
	const avgForwardingDistance = state.storageLocation?.avgForwardingDistance || 0;
	const accessRoadDistance = state.storageLocation?.accessRoadDistance || 0;
	const roadQuality = state.storageLocation?.roadQuality || "gravel";

	// 2. Cost calculations
	// Lisa 7: Raiekulu (RK) arvutamise valem
	// RK = a0 + a1 / (a2 + v) + a3 * v^a4 + a5 * KVK
	const getFellingRate = () => {
		// v – keskmine raiutav tüvemaht (m3). Kui on > 1 m3, siis v = 1.
		// Kuna meil pole hetkel täpset puude arvu käepärast, eeldame näiteks v = 0.5
		const v = 0.5; // TODO: arvuta tegelik keskmine tüvemaht andmetest
		const KVK = avgForwardingDistance; // keskmine kokkuveokaugus, m

		// RMK regressioonikonstandid (puuduvad dokumendist, paneme ajutised)
		const a0 = 11.5; 
		const a1 = 0;
		const a2 = 1;
		const a3 = 0;
		const a4 = 1;
		const a5 = 0;

		const RK = a0 + a1 / (a2 + v) + a3 * Math.pow(v, a4) + a5 * KVK;
		return RK;
	};

	const fellingRate = getFellingRate();
	const fellingCost = totalVolume * fellingRate;

	// Forwarding cost based on average distance
	// Base is 6 EUR/tm, adds 0.005 EUR per meter of distance (5 EUR per km)
	const forwardingRate = 6.0 + (avgForwardingDistance * 0.006);
	const forwardingCost = totalVolume * forwardingRate;

	// Total and averages
	const totalCosts = fellingCost + forwardingCost;
	const netValue = Math.max(0, grossValue - totalCosts);

	const avgCostPerTm = totalVolume > 0 ? totalCosts / totalVolume : 0;

	// Save to context on change
	useEffect(() => {
		setCosts({
			harvestType,
			terrainDifficulty,
			transportDistance,
			fellingCost,
			forwardingCost,
			totalCosts,
			netValue,
			totalVolume,
			grossValue,
		});
	}, [harvestType, terrainDifficulty, transportDistance, fellingCost, forwardingCost, totalCosts, netValue]);

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("et-EE", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(val);
	};

	// Percentage widths for visual chart
	const fellingPct = totalCosts > 0 ? (fellingCost / totalCosts) * 100 : 0;
	const forwardingPct = totalCosts > 0 ? (forwardingCost / totalCosts) * 100 : 0;

	return (
		<div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto w-full">
			<div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col shadow-sm">
				
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
					<div>
						<h2 className="text-2xl font-bold text-slate-900">Kulude kalkulatsioon</h2>
						<p className="text-slate-500 text-sm mt-1">Hinda raie-, kokkuveo- ja transpordikulusid parimate turuhindade põhjal</p>
					</div>
					<div className="flex gap-2">
						<span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono font-bold border border-slate-200">
							Kokku maht: {totalVolume.toFixed(1)} tm
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-8">

					{/* Calculations & Chart Column */}
					<div className="flex flex-col justify-between">
						
						{/* Financial breakdown KPI dashboard */}
						<div className="flex flex-col gap-4">
							<h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
								Kulude detailne jaotus
							</h3>
							
							<div className="space-y-2.5">
								{/* Felling (Harvester) */}
								<div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all">
									<div className="flex items-center gap-3">
										<div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />
										<div>
											<span className="text-sm font-bold text-slate-800">Raie ja langetamine (Harvester)</span>
											<span className="text-slate-500 text-xs block mt-0.5">Sae/lõikepea kulu: {fellingRate.toFixed(2)} €/tm</span>
										</div>
									</div>
									<span className="font-mono font-bold text-slate-900">{formatCurrency(fellingCost)}</span>
								</div>

								{/* Forwarding (Traktor metsast laoni) */}
								<div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all">
									<div className="flex items-center gap-3">
										<div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
										<div>
											<span className="text-sm font-bold text-slate-800">Kokkuvedu laoplatsini (Forwarder)</span>
											<span className="text-slate-500 text-xs block mt-0.5">Metsaveo traktor: {forwardingRate.toFixed(2)} €/tm</span>
										</div>
									</div>
									<span className="font-mono font-bold text-slate-900">{formatCurrency(forwardingCost)}</span>
								</div>


							</div>
						</div>

						{/* Cost vs Yield visualization bar */}
						<div className="mt-8 bg-slate-50 p-5 rounded-xl border border-slate-200">
							<h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3 block">
								Kogutulu vs kulu jaotus
							</h4>
							
							{/* Colored stacked progress bar */}
							<div className="w-full h-6 rounded-lg overflow-hidden flex shadow-inner bg-slate-200 mb-4">
								{totalCosts > 0 ? (
									<>
										<div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${(fellingCost / grossValue) * 100}%` }} title={`Raie: ${formatCurrency(fellingCost)}`} />
										<div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(forwardingCost / grossValue) * 100}%` }} title={`Kokkuvedu: ${formatCurrency(forwardingCost)}`} />

										<div className="bg-emerald-600/20 h-full transition-all duration-300 flex-grow" title={`Puhastulu: ${formatCurrency(netValue)}`} />
									</>
								) : (
									<div className="bg-slate-300 w-full h-full" />
								)}
							</div>

							<div className="grid grid-cols-3 gap-4 text-center mt-2">
								<div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
									<span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Metsa brutoväärtus</span>
									<span className="text-base font-black text-slate-800">{formatCurrency(grossValue)}</span>
								</div>
								<div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
									<span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Kulud kokku ({avgCostPerTm.toFixed(1)} €/tm)</span>
									<span className="text-base font-black text-red-600">{formatCurrency(totalCosts)}</span>
								</div>
								<div className="bg-white p-3 rounded-lg border border-emerald-300 shadow-sm bg-emerald-50/20">
									<span className="text-[9px] uppercase font-bold text-emerald-600 block mb-0.5">Puhastulu (Käes)</span>
									<span className="text-base font-black text-emerald-700">{formatCurrency(netValue)}</span>
								</div>
							</div>
						</div>

					</div>

				</div>

			</div>

			{/* Form navigation buttons */}
			<div className="flex justify-between mt-2">
				<button
					onClick={prevStep}
					className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
				>
					<ArrowLeft size={18} /> Tagasi
				</button>
				<button
					onClick={nextStep}
					className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-sm cursor-pointer"
				>
					Vaata Lõpptulemust <ArrowRight size={18} />
				</button>
			</div>
		</div>
	);
}

function formatDistanceVal(meters: number) {
	if (meters === 0) return "Määramata";
	if (meters < 1000) {
		return `${Math.round(meters)} m`;
	}
	return `${(meters / 1000).toFixed(2)} km`;
}
