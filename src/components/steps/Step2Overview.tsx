"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import {
	ArrowRight,
	ArrowLeft,
	Map,
	TrendingUp,
	MapPin,
	ChevronDown,
	ChevronUp,
	Info,
	Layers,
	ShieldCheck,
	ShieldAlert,
	Eye,
	Activity,
	Droplets,
	Loader2,
	Calendar,
	FileCheck,
	Satellite,
} from "lucide-react";
import React, { useState, useCallback } from "react";

interface RealSatResult {
	date: string | null;
	cloudfree: boolean;
	ndvi: number | null;
	ndpi: number | null;
	status: "HEALTHY" | "THINNED" | "CLEARCUT" | "UNKNOWN";
	stale: boolean;
	warning: string | null;
	error: string | null;
}

export default function Step2Overview() {
	const {
		state,
		nextStep,
		prevStep,
		setSatelliteAuditPeriod,
		setApiData,
		setXmlData,
		setSelectedEraldised,
		setRealSatData: setContextRealSatData,
	} = useCalculator();
	const data = state.apiData || state.xmlData;
	const [expandedEraldis, setExpandedEraldis] = useState<string | null>(null);
	const [mapLayer, setMapLayer] = useState<
		"EESTIFOTO" | "METSAFOTO" | "DSM" | "NDVI" | "NRG" | "NDPI"
	>("EESTIFOTO");
	const [isUpdating, setIsUpdating] = useState(false);
	const [realSatData, setRealSatData] = useState<
		Record<string, RealSatResult | null>
	>({});
	const [satLoading, setSatLoading] = useState(false);
	const [satCloudFreeDate, setSatCloudFreeDate] = useState<string | null>(null);
	// Arvutab eraldise geomeetria (Polygon/MultiPolygon) tsentripunkti LEST koordinaatides
	const computeCentroid = useCallback(
		(geometry: any): { cx: number; cy: number } | null => {
			if (!geometry?.coordinates) return null;
			let ring: number[][];
			if (geometry.type === "Polygon") {
				ring = geometry.coordinates[0];
			} else if (geometry.type === "MultiPolygon") {
				ring = geometry.coordinates[0]?.[0];
			} else {
				return null;
			}
			if (!ring?.length) return null;
			const cx =
				ring.reduce((s: number, p: number[]) => s + p[0], 0) / ring.length;
			const cy =
				ring.reduce((s: number, p: number[]) => s + p[1], 0) / ring.length;
			return { cx: Math.round(cx), cy: Math.round(cy) };
		},
		[],
	);

	const fetchRealSatelliteData = useCallback(
		async (details: any[]) => {
			const withGeom = details.filter((d) => d.geometry);
			if (withGeom.length === 0) return;

			setSatLoading(true);
			const results: Record<string, RealSatResult | null> = {};

			try {
				// 1. Leia pilvitu kuupäev esimese eraldise tsentripunkti põhjal
				const firstCentroid = computeCentroid(withGeom[0].geometry);
				if (!firstCentroid) {
					setSatLoading(false);
					return;
				}

				const { fetchSatelliteAuditClient } = await import("@/lib/client-api");
				const firstData = await fetchSatelliteAuditClient(
					firstCentroid.cx,
					firstCentroid.cy,
				);
				results[withGeom[0].eraldisId] = firstData;

				const cloudFreeDate = firstData.date;
				if (cloudFreeDate) {
					setSatCloudFreeDate(cloudFreeDate);
				}

				// 2. Ülejäänud eraldised paralleelselt, kasutades sama leitud kuupäeva
				if (withGeom.length > 1) {
					const restPromises = withGeom.slice(1).map(async (detail) => {
						const centroid = computeCentroid(detail.geometry);
						if (!centroid) return { id: detail.eraldisId, data: null };

						try {
							const satData = await fetchSatelliteAuditClient(
								centroid.cx,
								centroid.cy,
							);
							return { id: detail.eraldisId, data: satData };
						} catch {
							return { id: detail.eraldisId, data: null };
						}
					});

					const restResults = await Promise.all(restPromises);
					for (const { id, data } of restResults) {
						results[id] = data;
					}
				}
			} catch (e) {
				console.error("Satelliitandmete pärimine ebaõnnestus:", e);
			} finally {
				setRealSatData(results);
				const contextSatData = Object.fromEntries(
					Object.entries(results).map(([id, v]) => [
						id,
						v ? { status: v.status, ndvi: v.ndvi, ndpi: v.ndpi } : null,
					]),
				);
				// Save to shared context so other steps can use real data
				setContextRealSatData(contextSatData);
				setSatLoading(false);

				// Recalculate forest value with real satellite data to keep Step5 in sync
				if (state.satelliteAuditPeriod === "active") {
					try {
						const reqKat =
							state.katastritunnus || (data as any)?.katastritunnus;
						if (reqKat && reqKat !== "XML-Fail") {
							const { calculateForestValueClient } =
								await import("@/lib/client-api");
							const recalculated = await calculateForestValueClient(
								reqKat,
								"active",
								contextSatData,
							);
							if (state.xmlData) {
								setXmlData(recalculated);
							} else {
								setApiData(recalculated);
							}
						}
					} catch (e) {
						console.error("Recalculation with real sat data failed:", e);
					}
				}
			}
		},
		[
			computeCentroid,
			state.satelliteAuditPeriod,
			state.katastritunnus,
			state.xmlData,
			data,
			setApiData,
			setXmlData,
		],
	);
	const checkRaieStatus = React.useCallback((stand: any) => {
		const m = stand.meta || {};
		const arenguklass = (m.arengukl_kood || m.arenguklass || "")
			.toLowerCase()
			.trim();
		const vanus = parseInt(m.keskm_vanus || m.vanus || "0", 10);
		const raievanus = parseInt(
			m.raievanus ||
				m.kk_raievanus ||
				m.kkraievanus ||
				m.kaalutud_raievanus ||
				m.keskm_raievanus ||
				m.keskmRaievanus ||
				"0",
			10,
		);

		if (raievanus <= 0)
			return {
				lubatud: false,
				missing: true,
				pohjus: "Metsaregistris puuduvad andmed",
				raievanus: 0,
				vanus,
			};
		const isKups =
			arenguklass.includes("küps") ||
			arenguklass.includes("kups") ||
			arenguklass === "kü" ||
			arenguklass === "ku";
		if (isKups)
			return { lubatud: true, pohjus: "LUBATUD (Küps mets)", raievanus, vanus };
		if (vanus >= raievanus)
			return {
				lubatud: true,
				pohjus: `LUBATUD (Vanus ${vanus} a >= raievanus ${raievanus} a)`,
				raievanus,
				vanus,
			};
		return {
			lubatud: false,
			pohjus: `EI (${vanus}/${raievanus} a)`,
			raievanus,
			vanus,
		};
	}, []);

	React.useEffect(() => {
		if (data?.details && Object.keys(state.selectedEraldised).length === 0) {
			const initialSelection: Record<string, "LR" | "HR" | "X"> = {};
			data.details.forEach((d: any) => {
				const isAllowed = checkRaieStatus(d).lubatud;
				initialSelection[d.eraldisId] = isAllowed ? "LR" : "X";
			});
			setSelectedEraldised(initialSelection);
		}
	}, [
		data?.details,
		state.selectedEraldised,
		checkRaieStatus,
		setSelectedEraldised,
	]);
	React.useEffect(() => {
		if (data?.details && Object.keys(realSatData).length === 0 && !satLoading) {
			fetchRealSatelliteData(data.details);
		}
	}, [data?.details, realSatData, satLoading, fetchRealSatelliteData]);

	if (!data) return null;

	const avgAge = (() => {
		if (!data.details || data.details.length === 0) return 0;
		let sumAge = 0;
		let count = 0;
		for (const d of data.details) {
			const age = parseInt(d.meta?.keskm_vanus || d.meta?.vanus || "0", 10);
			if (age > 0) {
				sumAge += age;
				count++;
			}
		}
		return count > 0 ? Math.round(sumAge / count) : 0;
	})();

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

		if (mapLayer === "NDVI") {
			return `https://teenus.maaamet.ee/ows/wms-sentinel-2-ndvi?service=WMS&version=1.1.1&request=GetMap&layers=sentinel_2_ndvi&styles=&bbox=${bboxStr}&width=1000&height=600&srs=EPSG:3301&format=image/jpeg`;
		}
		if (mapLayer === "NRG") {
			return `https://teenus.maaamet.ee/ows/wms-sentinel-2-nrg?service=WMS&version=1.1.1&request=GetMap&layers=sentinel_2_nrg&styles=&bbox=${bboxStr}&width=1000&height=600&srs=EPSG:3301&format=image/jpeg`;
		}
		if (mapLayer === "NDPI") {
			return `https://teenus.maaamet.ee/ows/wms-sentinel-2-ndpi?service=WMS&version=1.1.1&request=GetMap&layers=sentinel_2_ndpi&styles=&bbox=${bboxStr}&width=1000&height=600&srs=EPSG:3301&format=image/jpeg`;
		}

		return "";
	};

	const getPolygonStyle = (stand: any) => {
		const audit = stand.satelliteAudit;
		const period = state.satelliteAuditPeriod;
		const statusInfo = checkRaieStatus(stand);

		if (period === "registry" || !audit) {
			if (!statusInfo.lubatud) {
				return {
					fill: "rgba(239, 68, 68, 0.08)",
					stroke: "#ef4444",
					strokeWidth: "2",
					strokeDasharray: "4 4",
				};
			}
			return {
				fill: "rgba(16, 185, 129, 0.12)",
				stroke: "#10b981",
				strokeWidth: "2",
				strokeDasharray: "none",
			};
		}

		// Kuna NDVI, NRG ja NDPI aluskaardid on juba reaalne satelliidi pilt, kuvame vector-piire õrna värviga, et taust oleks nähtav!
		if (mapLayer === "NDVI" || mapLayer === "NRG" || mapLayer === "NDPI") {
			const strokeColors: Record<string, string> = {
				HEALTHY: "#10b981",
				THINNED: "#f59e0b",
				CLEARCUT: "#ef4444",
			};
			const stroke = strokeColors[audit.status] || "#10b981";
			return {
				fill: "rgba(255, 255, 255, 0.05)", // läbipaistev täide, et satellite raster paistaks läbi
				stroke: stroke,
				strokeWidth: "2.5",
				strokeDasharray: statusInfo.lubatud ? "none" : "3 3",
			};
		}

		const colors: Record<string, { stroke: string; fill: string }> = {
			HEALTHY: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.08)" },
			THINNED: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.08)" },
			CLEARCUT: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.08)" },
		};

		const col = colors[audit.status] || colors.HEALTHY;
		return {
			fill: col.fill,
			stroke: col.stroke,
			strokeWidth: "2.5",
			strokeDasharray: statusInfo.lubatud ? "none" : "4 4",
		};
	};

	const handleAuditPeriodChange = async (period: "registry" | "active") => {
		setSatelliteAuditPeriod(period);
		setIsUpdating(true);

		try {
			const reqKat = state.katastritunnus || data.katastritunnus;
			if (reqKat && reqKat !== "XML-Fail") {
				const { calculateForestValueClient } = await import("@/lib/client-api");
				const parsed = await calculateForestValueClient(reqKat, period);
				if (state.xmlData) {
					setXmlData(parsed);
				} else {
					setApiData(parsed);
				}
			}
		} catch (e) {
			console.error("Failed to update audit period", e);
		} finally {
			setIsUpdating(false);
		}

		// ESTHub aktiveerides pärime reaalsed satelliitandmed eraldiste tsentripunktide jaoks
		if (period === "active" && data.details) {
			await fetchRealSatelliteData(data.details);
		}
		if (period === "registry") {
			setRealSatData({});
			setSatCloudFreeDate(null);
		}
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
										className="absolute inset-0 w-full h-full object-fill"
									/>
									{/* Shape Boundary Overlay */}
									{data.bbox &&
									data.details &&
									data.details.some((d: any) => d.geometry) ? (
										<>
											<svg
												viewBox={`${data.bbox[0]} ${-data.bbox[3]} ${data.bbox[2] - data.bbox[0]} ${data.bbox[3] - data.bbox[1]}`}
												className="absolute inset-0 w-full h-full pointer-events-none z-10"
												preserveAspectRatio="none"
											>
												{data.details.map((stand: any, index: number) => {
													if (!stand.geometry || !stand.geometry.coordinates)
														return null;
													const rings =
														stand.geometry.type === "Polygon"
															? stand.geometry.coordinates
															: stand.geometry.coordinates[0];
													const dStr = rings
														.map((ring: any) => {
															return (
																"M " +
																ring
																	.map(([x, y]: number[]) => `${x} ${-y}`)
																	.join(" L ") +
																" Z"
															);
														})
														.join(" ");

													const style = getPolygonStyle(stand);

													return (
														<path
															key={`${stand.eraldisId}-${index}`}
															d={dStr}
															fillRule="evenodd"
															fill={style.fill}
															stroke={style.stroke}
															strokeWidth={style.strokeWidth}
															strokeDasharray={style.strokeDasharray}
															className="drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]"
															vectorEffect="non-scaling-stroke"
														/>
													);
												})}
											</svg>
											<img
												src={`https://gsavalik.envir.ee/geoserver/metsaregister/ows?service=WMS&version=1.1.1&request=GetMap&layers=metsaregister:eraldis&styles=&bbox=${data.bbox[0]},${data.bbox[1]},${data.bbox[2]},${data.bbox[3]}&width=1000&height=600&srs=EPSG:3301&format=image/png&transparent=true&cql_filter=${encodeURIComponent(`katastri_nr='${state.katastritunnus}'`)}`}
												className="absolute inset-0 w-full h-full object-fill opacity-90 pointer-events-none z-20 mix-blend-multiply"
												alt="Eraldised (WMS)"
											/>
										</>
									) : (
										<img
											src={`https://gsavalik.envir.ee/geoserver/metsaregister/ows?service=WMS&version=1.1.1&request=GetMap&layers=metsaregister:eraldis&styles=&bbox=${data.bbox[0]},${data.bbox[1]},${data.bbox[2]},${data.bbox[3]}&width=1000&height=600&srs=EPSG:3301&format=image/png&transparent=true&cql_filter=${encodeURIComponent(`katastri_nr='${state.katastritunnus}'`)}`}
											className="absolute inset-0 w-full h-full object-fill opacity-80 pointer-events-none z-10"
											alt="Eraldised (WMS)"
										/>
									)}

									{/* Attribution indicator */}
									<div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-sm text-slate-400 font-mono text-[9px] pointer-events-none select-none font-bold z-20">
										Kaart: Maa- ja Ruumiamet 2026
									</div>
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
					<div className="w-full border border-slate-200 border-t-0 rounded-b-xl bg-slate-50 px-4 py-3 flex items-center gap-2 mb-6">
						<span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-2 shrink-0">
							Kaardikiht
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{(
								[
									"EESTIFOTO",
									"METSAFOTO",
									"DSM",
									"NDVI",
									"NRG",
									"NDPI",
								] as const
							).map((layer) => {
								if (
									["NDVI", "NRG", "NDPI"].includes(layer) &&
									Object.keys(realSatData).length === 0
								) {
									return null; // Peida satelliitkihid kui andmeid pole veel laetud
								}
								return (
									<button
										key={layer}
										onClick={() => setMapLayer(layer)}
										className={`px-4 py-1.5 text-[11px] uppercase font-bold tracking-wider rounded-lg transition-all duration-150 ${
											mapLayer === layer
												? "bg-emerald-600 text-white shadow-sm"
												: "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
										}`}
									>
										{layer === "EESTIFOTO"
											? "Ortofoto"
											: layer === "METSAFOTO"
												? "Metsanduslik ortofoto"
												: layer === "DSM"
													? "Kõrgusmudel"
													: layer === "NDVI"
														? "Taimkatte indeks (NDVI)"
														: layer === "NRG"
															? "Lähi-infrapuna (NRG)"
															: "Veekogud (NDPI)"}
									</button>
								);
							})}
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
								Keskmine Vanus
							</span>
						</div>
						<p className="text-3xl font-black text-slate-900">
							{avgAge > 0 ? `${avgAge} a` : "Määramata"}
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
									<th className="py-3 px-4 text-center">Raietüüp</th>
									<th className="py-3 px-4 w-12"></th>
								</tr>
							</thead>
							<tbody>
								{data.details?.map((detail: any, index: number) => {
									const isExpanded = expandedEraldis === detail.eraldisId;
									const m = detail.meta || {};
									const audit = detail.satelliteAudit;
									const period = state.satelliteAuditPeriod;
									const statusInfo = checkRaieStatus(detail);
									const currentType =
										state.selectedEraldised[detail.eraldisId] || "X";

									return (
										<React.Fragment key={`${detail.eraldisId}-${index}`}>
											<tr
												onClick={() =>
													setExpandedEraldis(
														isExpanded ? null : detail.eraldisId,
													)
												}
												className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
													isExpanded ? "bg-slate-50" : ""
												}`}
											>
												<td
													className={`py-3 px-4 font-bold text-slate-800 border-l-4 ${
														statusInfo.lubatud
															? "border-l-emerald-500 bg-emerald-50/5"
															: statusInfo.missing
																? "border-l-slate-400 bg-slate-50/5"
																: "border-l-red-500 bg-red-50/5"
													}`}
												>
													{m.eraldise_nr || detail.eraldisId}
												</td>
												<td className="py-3 px-4">{detail.pindala} ha</td>
												<td className="py-3 px-4">
													{m.peapuuliik_kood || m.peapuuliik || "-"}
												</td>
												<td className="py-3 px-4">
													<div className="flex items-center gap-1.5">
														<span>
															{m.keskm_vanus || m.vanus
																? `${m.keskm_vanus || m.vanus} a`
																: "-"}
														</span>
														{statusInfo.lubatud ? (
															<span
																className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded shrink-0 animate-pulse"
																title="Raiutav (küps või saavutanud raievanuse)"
															>
																Raiutav
															</span>
														) : statusInfo.missing ? (
															<span
																className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 rounded shrink-0"
																title="Metsaregistri andmetes puudub ametlik raievanus."
															>
																MÄÄRAMATA
															</span>
														) : (
															<span
																className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 rounded shrink-0"
																title={statusInfo.pohjus}
															>
																Keelatud
															</span>
														)}
													</div>
												</td>
												<td className="py-3 px-4">
													<div className="flex items-center justify-center">
														<div
															className={`flex rounded-lg overflow-hidden border ${statusInfo.lubatud ? "border-primary-200" : "border-slate-200 opacity-50 pointer-events-none"}`}
														>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setSelectedEraldised({
																		...state.selectedEraldised,
																		[detail.eraldisId]: "LR",
																	});
																}}
																className={`px-2 py-1 text-xs font-bold transition-colors ${currentType === "LR" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
																title="Lageraie"
															>
																LR
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setSelectedEraldised({
																		...state.selectedEraldised,
																		[detail.eraldisId]: "HR",
																	});
																}}
																className={`px-2 py-1 text-xs font-bold border-l border-r border-slate-200 transition-colors ${currentType === "HR" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 hover:bg-slate-50"}`}
																title="Harvendusraie"
															>
																HR
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setSelectedEraldised({
																		...state.selectedEraldised,
																		[detail.eraldisId]: "X",
																	});
																}}
																className={`px-2 py-1 text-xs font-bold transition-colors ${currentType === "X" ? "bg-rose-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
																title="Ei raiu"
															>
																X
															</button>
														</div>
													</div>
												</td>

												<td className="py-3 px-4 text-slate-400 text-center">
													{isExpanded ? (
														<ChevronUp size={16} />
													) : (
														<ChevronDown size={16} />
													)}
												</td>
											</tr>
											{isExpanded && (
												<tr className="bg-slate-50 border-b border-slate-200">
													<td colSpan={6} className="p-0">
														<div className="p-4 md:p-6 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-slate-100 flex flex-col gap-6">
															{/* ÜLEMINE RIDA: Oluline info (3 veergu) */}
															<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
																{/* 1. Põhiandmed */}
																<div>
																	<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																		<Info size={14} /> Põhiandmed
																	</h4>
																	<ul className="space-y-2 text-sm bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Arenguklass
																			</span>
																			<span className="font-medium text-slate-900">
																				{m.arengukl_kood ||
																					m.arenguklass ||
																					"-"}
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Boniteet
																			</span>
																			<span className="font-medium text-slate-900">
																				{m.boniteedi_kood || m.boniteet || "-"}
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Kasvukohatüüp
																			</span>
																			<span className="font-medium text-slate-900">
																				{m.kasvukoht_kood || m.kasvukoht || "-"}
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Keskmine kõrgus
																			</span>
																			<span className="font-medium text-slate-900">
																				{m.korgus ? `${m.korgus} m` : "-"}
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Täius (liitus)
																			</span>
																			<span className="font-medium text-slate-900">
																				{m.taius || m.liitus || "-"} %
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Kaitse/Piirang
																			</span>
																			<span
																				className={`font-medium ${m.kaitse || m.piirang || m.kaitsekategooria ? "text-amber-600" : "text-slate-900"}`}
																			>
																				{m.kaitse ||
																					m.piirang ||
																					m.kaitsekategooria ||
																					"Puudub"}
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Tagavara
																			</span>
																			<span className="font-medium text-slate-900">
																				{m.tagavara_y_ha || m.tagavara_1_ha
																					? `${m.tagavara_y_ha || m.tagavara_1_ha} tm/ha`
																					: "-"}
																			</span>
																		</li>
																		<li className="flex justify-between border-b border-slate-100 pb-1.5">
																			<span className="text-slate-500">
																				Minimaalne raievanus
																			</span>
																			<span
																				className={`font-semibold ${statusInfo.missing ? "text-slate-500" : "text-slate-800"}`}
																			>
																				{statusInfo.missing
																					? "Määramata"
																					: `${statusInfo.raievanus} a`}
																			</span>
																		</li>
																		<li className="flex justify-between pt-1">
																			<span className="text-slate-500">
																				Raie lubatavus
																			</span>
																			<span
																				className={`font-bold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
																					statusInfo.lubatud
																						? "bg-emerald-50 text-emerald-700 border border-emerald-200"
																						: statusInfo.missing
																							? "bg-slate-100 text-slate-600 border border-slate-300"
																							: "bg-red-50 text-red-700 border border-red-200"
																				}`}
																			>
																				{statusInfo.pohjus}
																			</span>
																		</li>
																	</ul>
																</div>

																{/* 2. Sortimendid või Arvutuse info */}
																{detail.sortimendid &&
																Object.keys(detail.sortimendid).length > 0 ? (
																	<div>
																		<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																			<TrendingUp size={14} /> Sortimentide
																			jaotus
																		</h4>
																		<div className="space-y-3">
																			{Object.entries(detail.sortimendid).map(
																				([liik, sort]: [string, any]) => (
																					<div
																						key={liik}
																						className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"
																					>
																						<div className="flex justify-between font-bold text-sm mb-2 border-b border-slate-100 pb-1">
																							<span className="text-slate-800">
																								Puuliik: {liik}
																							</span>
																						</div>
																						<div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
																							<div className="flex justify-between">
																								<span>Palk:</span>{" "}
																								<span className="font-medium text-slate-900">
																									{sort.palk?.toFixed(1)} tm
																								</span>
																							</div>
																							<div className="flex justify-between">
																								<span>Peenpalk:</span>{" "}
																								<span className="font-medium text-slate-900">
																									{sort.peenpalk?.toFixed(1)} tm
																								</span>
																							</div>
																							<div className="flex justify-between">
																								<span>Paber:</span>{" "}
																								<span className="font-medium text-slate-900">
																									{sort.paberipuit?.toFixed(1)}{" "}
																									tm
																								</span>
																							</div>
																							<div className="flex justify-between">
																								<span>Küte:</span>{" "}
																								<span className="font-medium text-slate-900">
																									{sort.kuttepuit?.toFixed(1)}{" "}
																									tm
																								</span>
																							</div>
																						</div>
																					</div>
																				),
																			)}
																		</div>
																	</div>
																) : (
																	<div>
																		<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																			<Info size={14} /> Arvutuse info
																		</h4>
																		<p className="text-sm bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-slate-600 leading-relaxed">
																			{detail.note ||
																				"Detailsed sortimendid puuduvad."}
																		</p>
																	</div>
																)}

																{/* 3. ESTHub REAALSED Mõõtmised */}
																{(() => {
																	const realData =
																		realSatData[detail.eraldisId];
																	if (!realData || realData.error === "NO_DATA")
																		return (
																			<div>
																				<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																					<Satellite size={14} /> ESTHub
																					Satelliitseire
																				</h4>
																				<p className="text-sm bg-slate-100 p-4 rounded-xl border border-slate-200 text-slate-500 italic">
																					{satLoading
																						? "Andmeid laetakse..."
																						: "Satelliitandmed puuduvad."}
																				</p>
																			</div>
																		);

																	return (
																		<div>
																			<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
																				<Satellite size={14} /> ESTHub
																				Satelliitseire
																			</h4>
																			<div
																				className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 ${
																					realData.status === "CLEARCUT"
																						? "bg-red-50 border-red-200"
																						: realData.status === "THINNED"
																							? "bg-amber-50 border-amber-200"
																							: "bg-emerald-50 border-emerald-200"
																				}`}
																			>
																				<div className="flex items-center justify-between mb-1">
																					<div className="flex items-center gap-1.5">
																						<span
																							className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
																								realData.status === "CLEARCUT"
																									? "bg-red-100 text-red-700 border-red-300"
																									: realData.status ===
																										  "THINNED"
																										? "bg-amber-100 text-amber-700 border-amber-300"
																										: "bg-emerald-100 text-emerald-700 border-emerald-300"
																							}`}
																						>
																							{realData.status === "CLEARCUT"
																								? "⚠ Lageraie oht"
																								: realData.status === "THINNED"
																									? "~ Osaline raie"
																									: "✓ Terve mets"}
																						</span>
																						{realData.stale && (
																							<span className="px-1.5 py-1 text-[9px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-300 rounded-lg">
																								Vana pilt
																							</span>
																						)}
																					</div>
																				</div>
																				<ul className="space-y-2 text-xs">
																					<li className="flex justify-between border-b border-black/5 pb-1.5">
																						<span className="text-slate-600 font-medium">
																							Taimkate (NDVI)
																						</span>
																						<span
																							className={`font-mono font-bold ${
																								realData.status === "CLEARCUT"
																									? "text-red-700"
																									: realData.status ===
																										  "THINNED"
																										? "text-amber-700"
																										: "text-emerald-700"
																							}`}
																						>
																							{realData.ndvi?.toFixed(3) ??
																								"N/A"}
																						</span>
																					</li>
																					<li className="flex justify-between border-b border-black/5 pb-1.5">
																						<span className="text-slate-600 font-medium">
																							Pinnase niiskus (NDPI)
																						</span>
																						<span className="font-mono font-bold text-slate-700">
																							{realData.ndpi?.toFixed(3) ??
																								"N/A"}
																						</span>
																					</li>
																					<li className="flex justify-between pt-0.5">
																						<span className="text-slate-600 font-medium">
																							Pildi kuupäev
																						</span>
																						<span className="font-bold text-slate-800">
																							{realData.date
																								? new Date(
																										realData.date,
																									).toLocaleDateString(
																										"et-EE",
																										{
																											day: "numeric",
																											month: "long",
																											year: "numeric",
																										},
																									)
																								: "-"}
																							{!realData.cloudfree && (
																								<span className="ml-1 text-amber-600 text-[10px] font-normal">
																									(lähim)
																								</span>
																							)}
																						</span>
																					</li>
																				</ul>
																				{realData.warning && (
																					<p className="text-[10px] text-amber-800 bg-amber-100/50 px-2.5 py-2 rounded-lg border border-amber-200/50 leading-relaxed font-medium mt-1">
																						{realData.warning}
																					</p>
																				)}
																			</div>
																		</div>
																	);
																})()}
															</div>

															{/* ALUMINE RIDA: Kõik detailsed registriandmed */}
															<div className="mt-2">
																<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2 border-t border-slate-200 pt-6">
																	<Layers size={14} /> Kõik registri andmed (
																	{
																		Object.keys(m).filter(
																			(k) =>
																				typeof m[k] !== "object" &&
																				m[k] !== null &&
																				m[k] !== "",
																		).length
																	}
																	)
																</h4>
																<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
																	<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
																		{Object.entries(m)
																			.filter(
																				([key, value]) =>
																					value !== null &&
																					value !== "" &&
																					typeof value !== "object",
																			)
																			.sort(([a], [b]) => a.localeCompare(b))
																			.map(([key, value]) => (
																				<div
																					key={key}
																					className="flex flex-col border-b border-slate-100 pb-1.5"
																				>
																					<span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
																						{key.replace(/_/g, " ")}
																					</span>
																					<span
																						className="text-sm font-medium text-slate-800 truncate"
																						title={String(value)}
																					>
																						{String(value)}
																					</span>
																				</div>
																			))}
																	</div>
																</div>
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
					disabled={
						!Object.values(state.selectedEraldised).some(
							(t) => t === "LR" || t === "HR",
						)
					}
					className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed"
				>
					Määra Ladustamine <ArrowRight size={18} />
				</button>
			</div>
		</div>
	);
}
