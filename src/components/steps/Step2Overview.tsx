"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowRight, ArrowLeft, Map, TrendingUp, MapPin, ChevronDown, ChevronUp, Info, Layers } from "lucide-react";
import React, { useState } from "react";

export default function Step2Overview() {
	const { state, nextStep, prevStep } = useCalculator();
	const data = state.apiData || state.xmlData;
	const [expandedEraldis, setExpandedEraldis] = useState<string | null>(null);
	const [mapLayer, setMapLayer] = useState<"EESTIFOTO" | "METSAFOTO" | "DSM">("EESTIFOTO");

	if (!data) return null;

	const getBaseMapUrl = () => {
		if (!data.bbox) return "";
		const bboxStr = `${data.bbox[0]},${data.bbox[1]},${data.bbox[2]},${data.bbox[3]}`;
		
		if (mapLayer === "EESTIFOTO") {
			return `https://kaart.maaamet.ee/wms/fotokaart?service=WMS&version=1.1.1&request=GetMap&layers=EESTIFOTO&styles=&bbox=${bboxStr}&width=1000&height=600&srs=EPSG:3301&format=image/jpeg`;
		}
		if (mapLayer === "METSAFOTO") {
			return `https://kaart.maaamet.ee/wms/alus?service=WMS&version=1.1.1&request=GetMap&layers=cir_ngr&styles=&bbox=${bboxStr}&width=1000&height=600&srs=EPSG:3301&format=image/jpeg`;
		}
		if (mapLayer === "DSM") {
			return `https://kaart.maaamet.ee/wms/fotokaart?service=WMS&version=1.1.1&request=GetMap&layers=nDSM&styles=&bbox=${bboxStr}&width=1000&height=600&srs=EPSG:3301&format=image/jpeg`;
		}
		return "";
	};

	return (
		<div className="flex flex-col gap-6 w-full animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto">
			<div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col shadow-sm">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-slate-900">
						Kinnistu ülevaade
					</h2>
					<span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-mono font-medium border border-slate-200">
						{state.katastritunnus}
					</span>
				</div>

				{/* Kaart - WMS pilt või Placeholder */}
				<div className="w-full h-64 md:h-80 bg-slate-100 rounded-xl rounded-b-none border border-slate-200 border-b-0 overflow-hidden relative flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
					{data.bbox ? (
						<>
							{/* WMS Map Images from Maa-amet */}
							<div className="w-full h-full relative overflow-hidden">
								<div className="w-full h-full relative">
									{/* Base Map */}
									<img
										src={getBaseMapUrl()}
										alt="Metsatüki aluskaart"
										className="absolute inset-0 w-full h-full object-cover"
									/>
									{/* Shape Boundary Overlay (WMS with CQL filter) */}
									<img
										src={`https://gsavalik.envir.ee/geoserver/metsaregister/ows?service=WMS&version=1.1.1&request=GetMap&layers=metsaregister:eraldis&styles=&bbox=${data.bbox[0]},${data.bbox[1]},${data.bbox[2]},${data.bbox[3]}&width=1000&height=600&srs=EPSG:3301&format=image/png&transparent=true&cql_filter=${encodeURIComponent(`katastri_nr='${state.katastritunnus}'`)}`}
										alt="Metsatüki piirid"
										className="absolute inset-0 w-full h-full object-cover opacity-100 drop-shadow-[0_0_4px_rgba(255,255,255,1)] drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] mix-blend-normal"
									/>
								</div>
							</div>
						</>
					) : (

						<div className="bg-white/90 backdrop-blur-md border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col items-center text-center max-w-sm mx-4">
							<div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
								<MapPin size={24} />
							</div>
							<h3 className="text-lg font-bold text-slate-900 mb-1">
								Maa-ameti Kaart
							</h3>
							<p className="text-sm text-slate-500 mb-4">
								Maa-ameti geoportaal ei luba kaarti otse siia integreerida. Kogu
								ruumiandmete info on saadaval Minu Katastris.
							</p>
							<a
								href={`https://minu.kataster.ee/ky/${state.katastritunnus.replace(/:/g, "")}`}
								target="_blank"
								rel="noopener noreferrer"
								className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
							>
								Vaata Minu Katastrist <ArrowRight size={16} />
							</a>
						</div>
					)}
				</div>

				{/* Map Layer Switcher - outside the map */}
				{data.bbox && (
					<div className="w-full border border-slate-200 border-t-0 rounded-b-xl bg-slate-50 px-4 py-3 flex items-center gap-2 mb-8">
						<span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-2 shrink-0">Kaardikiht</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{(["EESTIFOTO", "METSAFOTO", "DSM"] as const).map((layer) => (
								<button
									key={layer}
									onClick={() => setMapLayer(layer)}
									className={`px-4 py-1.5 text-[11px] uppercase font-bold tracking-wider rounded-lg transition-all duration-150 ${
										mapLayer === layer
											? "bg-emerald-600 text-white shadow-sm"
											: "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
									}`}
								>
									{layer === "EESTIFOTO" ? "Ortofoto" : layer === "METSAFOTO" ? "Metsanduslik ortofoto" : "Maakatte kõrgusmudel"}
								</button>
							))}
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
					<div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col">
						<div className="flex items-center gap-2 text-slate-500 mb-2">
							<Map size={18} />
							<span className="text-[11px] uppercase font-bold tracking-wider">
								Kogupindala
							</span>
						</div>
						<p className="text-3xl font-black text-slate-900">
							{data.details
								? data.details
										.reduce(
											(sum: number, item: any) => sum + (item.pindala || 0),
											0,
										)
										.toFixed(2)
								: "0"}{" "}
							ha
						</p>
					</div>
					<div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col">
						<div className="flex items-center gap-2 text-slate-500 mb-2">
							<MapPin size={18} />
							<span className="text-[11px] uppercase font-bold tracking-wider">
								Eraldised Kokku
							</span>
						</div>
						<p className="text-3xl font-black text-slate-900">
							{data.eraldisteArv} tk
						</p>
					</div>
					<div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col">
						<div className="flex items-center gap-2 text-slate-500 mb-2">
							<TrendingUp size={18} />
							<span className="text-[11px] uppercase font-bold tracking-wider">
								Hinnanguline Väärtus
							</span>
						</div>
						<p className="text-3xl font-black text-emerald-600">
							{new Intl.NumberFormat("et-EE", {
								style: "currency",
								currency: data.currency || "EUR",
								maximumFractionDigits: 0,
							}).format(data.totalValue || 0)}
						</p>
					</div>
				</div>

				{/* Eraldiste Detailne Tabel (Accordion) */}
				<div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
					<div className="bg-slate-50 border-b border-slate-200 p-4">
						<h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
							Metsaeraldised ({data.details?.length || 0})
						</h3>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
								<tr>
									<th className="py-3 px-4 w-20">Eraldis</th>
									<th className="py-3 px-4">Pindala</th>
									<th className="py-3 px-4">Peapuuliik</th>
									<th className="py-3 px-4">Vanus</th>
									<th className="py-3 px-4 text-right">Väärtus</th>
									<th className="py-3 px-4 w-12"></th>
								</tr>
							</thead>
							<tbody>
								{data.details?.map((detail: any) => {
									const isExpanded = expandedEraldis === detail.eraldisId;
									const m = detail.meta || {};
									return (
										<React.Fragment key={detail.eraldisId}>
											<tr
												onClick={() => setExpandedEraldis(isExpanded ? null : detail.eraldisId)}
												className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
													isExpanded ? "bg-slate-50" : ""
												}`}
											>
												<td className="py-3 px-4 font-bold text-slate-800">
													{detail.eraldisId}
												</td>
												<td className="py-3 px-4">{detail.pindala} ha</td>
												<td className="py-3 px-4">
													{m.peapuuliik_kood || m.peapuuliik || "-"}
												</td>
												<td className="py-3 px-4">
													{m.keskm_vanus || m.vanus || "-"} a
												</td>
												<td className="py-3 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
													{new Intl.NumberFormat("et-EE", {
														style: "currency",
														currency: "EUR",
														maximumFractionDigits: 0,
													}).format(detail.value || 0)}
												</td>
												<td className="py-3 px-4 text-slate-400 text-center">
													{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
												</td>
											</tr>
											{isExpanded && (
												<tr className="bg-slate-50 border-b border-slate-200">
													<td colSpan={6} className="p-0">
														<div className="p-4 md:p-6 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-slate-100">
															<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
																<div>
																	<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																		<Info size={14} /> Üldandmed
																	</h4>
																	<ul className="space-y-2 text-sm">
																		<li className="flex justify-between border-b border-slate-200 pb-1">
																			<span className="text-slate-500">Arenguklass</span>
																			<span className="font-medium text-slate-900">{m.arengukl_kood || "-"}</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-200 pb-1">
																			<span className="text-slate-500">Boniteet</span>
																			<span className="font-medium text-slate-900">{m.boniteedi_kood || "-"}</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-200 pb-1">
																			<span className="text-slate-500">Kasvukohatüüp</span>
																			<span className="font-medium text-slate-900">{m.kasvukoht_kood || "-"}</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-200 pb-1">
																			<span className="text-slate-500">Keskmine kõrgus</span>
																			<span className="font-medium text-slate-900">{m.korgus ? `${m.korgus} m` : "-"}</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-200 pb-1">
																			<span className="text-slate-500">Tagavara</span>
																			<span className="font-medium text-slate-900">{m.tagavara_y_ha ? `${m.tagavara_y_ha} tm/ha` : "-"}</span>
																		</li>
																	</ul>
																</div>

																{/* Sortimendid if available */}
																{detail.sortimendid && Object.keys(detail.sortimendid).length > 0 ? (
																	<div>
																		<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																			<TrendingUp size={14} /> Sortimentide jaotus
																		</h4>
																		<div className="space-y-3">
																			{Object.entries(detail.sortimendid).map(
																				([liik, sort]: [string, any]) => (
																					<div key={liik} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
																						<div className="flex justify-between font-bold text-sm mb-2 border-b border-slate-100 pb-1">
																							<span className="text-slate-800">Puuliik: {liik}</span>
																							<span className="text-emerald-600">
																								{new Intl.NumberFormat("et-EE", {
																									style: "currency",
																									currency: "EUR",
																									maximumFractionDigits: 0,
																								}).format(sort.value || 0)}
																							</span>
																						</div>
																						<div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
																							<div className="flex justify-between">
																								<span>Palk:</span> <span>{sort.palk?.toFixed(1)} tm</span>
																							</div>
																							<div className="flex justify-between">
																								<span>Peenpalk:</span> <span>{sort.peenpalk?.toFixed(1)} tm</span>
																							</div>
																							<div className="flex justify-between">
																								<span>Paber:</span> <span>{sort.paberipuit?.toFixed(1)} tm</span>
																							</div>
																							<div className="flex justify-between">
																								<span>Küte:</span> <span>{sort.kuttepuit?.toFixed(1)} tm</span>
																							</div>
																						</div>
																					</div>
																				)
																			)}
																		</div>
																	</div>
																) : (
																	<div>
																		<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																			<Info size={14} /> Arvutuse info
																		</h4>
																		<p className="text-sm bg-white p-3 rounded-lg border border-slate-200 text-slate-600">
																			{detail.note || "Detailsed sortimendid puuduvad."}
																		</p>
																	</div>
																)}
															</div>
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

				{data.warning && (
					<div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mt-4 flex items-start gap-3">
						<p className="font-medium text-sm leading-relaxed">
							{data.warning}
						</p>
					</div>
				)}
			</div>

			<div className="flex justify-between mt-2">
				<button
					onClick={prevStep}
					className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm"
				>
					<ArrowLeft size={18} /> Tagasi
				</button>
				<button
					onClick={nextStep}
					className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm"
				>
					Vali Eraldised <ArrowRight size={18} />
				</button>
			</div>
		</div>
	);
}
