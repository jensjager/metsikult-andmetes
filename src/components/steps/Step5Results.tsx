"use client";

import React, { useState } from "react";
import { useCalculator } from "@/lib/CalculatorContext";
import { getOfficialPrice } from "@/lib/valuation/priceLoader";
import {
	ArrowLeft,
	RefreshCw,
	BarChart,
	TrendingUp,
	DollarSign,
	Truck,
	ShieldAlert,
	ShieldCheck,
	ChevronDown,
	ChevronUp,
} from "lucide-react";

export default function Step5Results() {
	const { state, prevStep, reset } = useCalculator();
	const data = state.apiData || state.xmlData;
	const [expandedEraldis, setExpandedEraldis] = useState<string | null>(null);
	if (!data) return null;

	// Filter data based on selected eraldised and apply HR reductions
	const filteredDetails = data.details
		.filter((d: any) => {
			const type = state.selectedEraldised[d.eraldisId];
			return type === "LR" || type === "HR";
		})
		.map((d: any) => {
			const type = state.selectedEraldised[d.eraldisId];
			if (type === "LR") return d;

			// Harvendusraie multiplier (40% of original yield)
			const multiplier = 0.4;
			return {
				...d,
				value: d.value * multiplier,
				note: d.note
					? d.note + " (Harvendusraie: tulu/maht x0.4)"
					: "Harvendusraie: tulu/maht x0.4",
				sortimendid: d.sortimendid
					? Object.fromEntries(
							Object.entries(d.sortimendid).map(([k, v]: [string, any]) => [
								k,
								{
									...v,
									palk: v.palk * multiplier,
									peenpalk: v.peenpalk * multiplier,
									paberipuit: v.paberipuit * multiplier,
									kuttepuit: v.kuttepuit * multiplier,
									value: v.value * multiplier,
								},
							]),
						)
					: d.sortimendid,
				elemendid: d.elemendid
					? d.elemendid.map((el: any) => ({
							...el,
							tagavara: el.tagavara * multiplier,
							tagavara_absoluutne: el.tagavara_absoluutne * multiplier,
						}))
					: d.elemendid,
			};
		});

	const costs = state.costs;

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("et-EE", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(val);
	};

	return (
		<div className="flex flex-col gap-6 w-full animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto">
			<div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col shadow-sm">
				{/* Uniform Header matching other steps */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
					<div className="flex items-center gap-3">
						<div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
							<BarChart size={28} />
						</div>
						<div>
							<h2 className="text-2xl font-bold text-slate-900">Lõpptulemus</h2>
							<p className="text-slate-500 text-sm mt-1">
								Koondaruanne valitud eraldiste väärtuse ja kalkuleeritud kulude
								kohta
							</p>
						</div>
					</div>
					<span className="self-start sm:self-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono font-bold border border-slate-200">
						{state.katastritunnus}
					</span>
				</div>

				<div className="flex flex-col gap-8">
					{/* ESTHub Satelliitauditi Turvaaruandlus (Security Audit Banner) */}
					{state.satelliteAuditPeriod === "active" &&
					data.avertedLoss &&
					data.avertedLoss > 0 ? (
						<div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
							<div className="flex items-start gap-4">
								<div className="p-3 bg-red-100 rounded-xl text-red-700 shrink-0">
									<ShieldAlert size={28} />
								</div>
								<div>
									<h3 className="text-lg font-bold text-red-950 mb-1">
										Hoiatus: Metsaregistri andmed on aegunud!
									</h3>
									<p className="text-red-800 text-sm leading-relaxed max-w-xl font-medium">
										Satelliitkontroll tuvastas valitud metsasektoris muudatusi.
									</p>
								</div>
							</div>
						</div>
					) : state.satelliteAuditPeriod === "active" ? (
						<div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
							<div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
								<ShieldCheck size={28} />
							</div>
							<div>
								<h3 className="text-lg font-bold text-emerald-950 mb-1">
									Metsa seisukord satelliidilt kinnitatud!
								</h3>
								<p className="text-emerald-800 text-sm leading-relaxed max-w-xl font-medium">
									Kõik eraldised vastavad täielikult registri andmetele.
								</p>
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
									Andmed põhinevad ainult Metsaregistri ajaloolisel kirjeldusel.
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
										Puidu puhasmüük
									</span>
									<h3 className="text-5xl md:text-6xl font-black text-white tracking-tight bg-clip-text">
										{formatCurrency(costs.netValue)}
									</h3>
									<p className="text-slate-400 text-sm mt-3 leading-relaxed">
										Kalkuleeritud puhastulu pärast raie-, veo- ja
										logistikakulude mahaarvamist.
									</p>
								</div>

								<div className="md:col-span-6 grid grid-cols-2 gap-4">
									<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
										<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
											Metsa brutoväärtus
										</span>
										<span className="text-xl font-bold text-emerald-400 font-mono">
											{formatCurrency(costs.grossValue)}
										</span>
									</div>
									<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
										<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
											Logistikakulud kokku
										</span>
										<span className="text-xl font-bold text-red-400 font-mono">
											{formatCurrency(costs.totalCosts)}
										</span>
									</div>
									<div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
										<span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
											Raie kokkumaht
										</span>
										<span className="text-xl font-bold text-slate-100 font-mono">
											{costs.totalVolume.toFixed(1)} tm
										</span>
									</div>
								</div>
							</div>

							{/* Itemized cost collapse description */}
							<div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs text-slate-400">
								<div>
									<span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">
										Raie (Harvester)
									</span>
									<span className="font-semibold text-slate-300 font-mono">
										{formatCurrency(costs.fellingCost)}
									</span>
								</div>
								<div>
									<span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">
										Metsavedu (Forwarder)
									</span>
									<span className="font-semibold text-slate-300 font-mono">
										{formatCurrency(costs.forwardingCost)}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Detailed stand valuation elements */}
					<div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
						<div className="bg-slate-50 border-b border-slate-200 p-4">
							<h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
								Valitud eraldiste detailid ({filteredDetails.length})
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase">
									<tr>
										<th className="py-3 px-4 w-24">Eraldis</th>
										<th className="py-3 px-4">Pindala</th>
										<th className="py-3 px-4">Raietüüp</th>
										<th className="py-3 px-4 text-right">Maht</th>
										<th className="py-3 px-4 text-right">Brutoväärtus</th>
										<th className="py-3 px-4 w-12 text-center"></th>
									</tr>
								</thead>
								<tbody>
									{filteredDetails.map((eraldis: any, index: number) => {
										const isExpanded = expandedEraldis === eraldis.eraldisId;
										const type = state.selectedEraldised[eraldis.eraldisId];
										const multiplier = type === "HR" ? 0.4 : 1.0;

										let maht = 0;
										if (eraldis.sortimendid) {
											maht = Object.values(eraldis.sortimendid).reduce(
												(sum: number, v: any) =>
													sum +
													(v.palk || 0) +
													(v.peenpalk || 0) +
													(v.paberipuit || 0) +
													(v.kuttepuit || 0),
												0,
											);
										} else if (
											eraldis.elemendid &&
											eraldis.elemendid.length > 0
										) {
											maht =
												eraldis.elemendid.reduce(
													(s: number, el: any) =>
														s + (el.tagavara_absoluutne || 0),
													0,
												) * multiplier;
										} else {
											const tagavaraHa =
												eraldis.meta?.tagavara_y_ha ||
												eraldis.meta?.tagavara_1_ha ||
												0;
											maht = tagavaraHa * (eraldis.pindala || 0) * multiplier;
										}

										return (
											<React.Fragment key={`${eraldis.eraldisId}-${index}`}>
												<tr
													onClick={() =>
														setExpandedEraldis(
															isExpanded ? null : eraldis.eraldisId,
														)
													}
													className={`border-b hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? "bg-emerald-50/40 border-slate-200" : "border-slate-100"}`}
												>
													<td
														className={`py-3 px-4 font-bold text-slate-800 border-l-4 transition-colors ${isExpanded ? "border-l-emerald-500" : "border-l-transparent"}`}
													>
														{eraldis.meta?.eraldise_nr || eraldis.eraldisId}
													</td>
													<td className="py-3 px-4 text-slate-600">
														{eraldis.pindala.toFixed(2)} ha
													</td>
													<td className="py-3 px-4">
														{type === "LR" ? (
															<span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
																Lageraie
															</span>
														) : (
															<span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">
																Harvendus
															</span>
														)}
													</td>
													<td className="py-3 px-4 text-right font-semibold text-slate-700">
														{maht.toFixed(1)}{" "}
														<span className="text-slate-400 font-normal text-xs">
															tm
														</span>
													</td>
													<td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
														{formatCurrency(eraldis.value)}
													</td>
													<td className="py-3 px-4 text-slate-400 text-center">
														{isExpanded ? (
															<ChevronUp
																size={16}
																className="text-emerald-600"
															/>
														) : (
															<ChevronDown size={16} />
														)}
													</td>
												</tr>
												{isExpanded && (
													<tr className="bg-emerald-50/10 border-b border-slate-200">
														<td
															colSpan={6}
															className="p-0 border-l-4 border-l-emerald-500"
														>
															<div className="p-3 md:p-4 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-emerald-500/10 flex flex-col gap-4">
																{eraldis.sortimendid &&
																	Object.keys(eraldis.sortimendid).length >
																		0 && (
																		<div>
																			<h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 ml-1">
																				Arvestuslik sortimenteerimine ja
																				turuhinnad
																			</h4>
																			{Object.entries(eraldis.sortimendid).map(
																				([liik, andmed]: [string, any]) => {
																					const hasAnyVolume = [
																						"palk",
																						"peenpalk",
																						"paberipuit",
																						"kuttepuit",
																					].some(
																						(k) => (andmed[k] || 0) > 0.05,
																					);
																					if (!hasAnyVolume) return null;

																					return (
																						<div
																							key={liik}
																							className="mb-3 last:mb-0 bg-white border border-slate-200 rounded-xl p-3 shadow-sm"
																						>
																							<div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
																								<h5 className="font-bold text-slate-800 flex items-center gap-2 text-base">
																									<div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
																									Puuliik: {liik}
																								</h5>
																								<span className="font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
																									{formatCurrency(
																										andmed.value || 0,
																									)}
																								</span>
																							</div>
																							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
																								{[
																									{ name: "Palk", key: "palk" },
																									{
																										name: "Peenpalk",
																										key: "peenpalk",
																									},
																									{
																										name: "Paberipuit",
																										key: "paberipuit",
																									},
																									{
																										name: "Küttepuit",
																										key: "kuttepuit",
																									},
																								].map((s) => {
																									const volume =
																										andmed[s.key] || 0;
																									if (volume <= 0.05)
																										return null;
																									const pricePerTm =
																										getOfficialPrice(
																											liik,
																											s.key as any,
																										);
																									const value =
																										volume * pricePerTm;
																									return (
																										<div
																											key={s.key}
																											className="flex flex-row items-center justify-between p-2.5 px-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-200 transition-colors"
																										>
																											<div>
																												<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
																													{s.name}
																												</div>
																												<div className="text-sm font-black text-slate-800">
																													{volume.toFixed(1)}{" "}
																													<span className="text-slate-400 font-normal text-xs">
																														tm
																													</span>
																												</div>
																											</div>
																											<div className="text-right">
																												<div className="text-[10px] font-medium text-slate-500 mb-0.5">
																													{pricePerTm.toFixed(
																														2,
																													)}{" "}
																													€/tm
																												</div>
																												<div className="text-sm font-mono font-bold text-slate-700">
																													{formatCurrency(
																														value,
																													)}
																												</div>
																											</div>
																										</div>
																									);
																								})}
																							</div>
																						</div>
																					);
																				},
																			)}
																		</div>
																	)}
															</div>
														</td>
													</tr>
												)}
											</React.Fragment>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom navigation and control */}
			<div className="flex justify-between mt-2">
				<button
					onClick={prevStep}
					className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
				>
					<ArrowLeft size={18} /> Tagasi
				</button>
				<button
					onClick={reset}
					className="px-8 py-3 rounded-xl font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
				>
					<RefreshCw size={18} /> Alusta Uuesti
				</button>
			</div>
		</div>
	);
}
