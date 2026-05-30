"use client";

import { useCalculator } from "@/lib/CalculatorContext";
import { ArrowRight, ArrowLeft, MapPin, HelpCircle, Info, Compass, AlertCircle, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import React, { useState, useEffect } from "react";

interface Point {
	x: number;
	y: number;
}

export default function Step3Storage() {
	const { state, setStorageLocation, nextStep, prevStep } = useCalculator();
	const data = state.apiData || state.xmlData;

	const [landing, setLanding] = useState<Point | null>(state.storageLocation?.landingCoords || null);
	
	const roadQuality = "gravel";
	const yardCapacity = "full";
	
	const [mapLayer, setMapLayer] = useState<"EESTIFOTO" | "METSAFOTO" | "DSM">("EESTIFOTO");
	const [dismissedIntro, setDismissedIntro] = useState<boolean>(false);

	// Zoom and Pan States
	const [zoomLevel, setZoomLevel] = useState<number>(1);
	const [pan, setPan] = useState<Point>({ x: 0, y: 0 });

	// Drag States for Mouse/Touch drag-to-pan
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [mouseDownPos, setMouseDownPos] = useState<Point>({ x: 0, y: 0 });
	const [startPan, setStartPan] = useState<Point>({ x: 0, y: 0 });
	const [hasDragged, setHasDragged] = useState<boolean>(false);
	const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
	const [isMapLoading, setIsMapLoading] = useState<boolean>(false);

	const mapRef = React.useRef<HTMLDivElement>(null);
	const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 1000, height: 600 });

	useEffect(() => {
		if (!mapRef.current) return;
		const observer = new ResizeObserver((entries) => {
			if (!entries || entries.length === 0) return;
			const { width, height } = entries[0].contentRect;
			if (width > 0 && height > 0) {
				setContainerSize({ width, height });
			}
		});
		observer.observe(mapRef.current);
		return () => observer.disconnect();
	}, []);

	if (!data || !data.bbox) {
		return (
			<div className="flex flex-col gap-6 animate-in fade-in duration-300">
				<div className="glass-panel p-8 rounded-2xl text-center">
					<AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
					<h3 className="text-xl font-bold text-slate-900 mb-2">Kaardiandmed puuduvad</h3>
					<p className="text-slate-500 max-w-md mx-auto mb-6">
						Logistika ja ladustamise planeerimiseks on vaja geomeetriaga katastriandmeid. 
						Alusta uuesti ning kasuta kas Päringut või laadi üles geomeetriaga XML fail.
					</p>
					<button onClick={prevStep} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors">
						Tagasi
					</button>
				</div>
			</div>
		);
	}

	// Calculate zoomed/panned bounding box coordinates based on actual aspect ratio
	const [minX, minY, maxX, maxY] = (() => {
		const [oMinX, oMinY, oMaxX, oMaxY] = data.bbox || [0, 0, 0, 0];
		const oWidth = oMaxX - oMinX;
		const oHeight = oMaxY - oMinY;

		const aspect = containerSize.width / containerSize.height;
		const oAspect = oWidth / oHeight;

		let w = oWidth;
		let h = oHeight;

		if (oAspect > aspect) {
			h = oWidth / aspect;
		} else {
			w = oHeight * aspect;
		}

		// Zoomed dimensions
		const wZoom = w / zoomLevel;
		const hZoom = h / zoomLevel;

		// Original center
		const oCx = oMinX + oWidth / 2;
		const oCy = oMinY + oHeight / 2;

		// Shift center by pan (pan.x and pan.y are fractional offsets)
		const cx = oCx + pan.x * oWidth;
		const cy = oCy + pan.y * oHeight;

		return [
			cx - wZoom / 2,
			cy - hZoom / 2,
			cx + wZoom / 2,
			cy + hZoom / 2
		];
	})();

	// Calculate visual centroid of a stand polygon
	const getCentroid = (geometry: any): Point | null => {
		if (!geometry || !geometry.coordinates) return null;
		let coords: any[] = [];
		if (geometry.type === "Polygon") {
			coords = geometry.coordinates[0];
		} else if (geometry.type === "MultiPolygon") {
			coords = geometry.coordinates[0][0];
		} else {
			return null;
		}
		
		let sumX = 0;
		let sumY = 0;
		let count = 0;
		for (const p of coords) {
			if (Array.isArray(p) && p.length >= 2) {
				sumX += p[0];
				sumY += p[1];
				count++;
			}
		}
		if (count === 0) return null;
		return { x: sumX / count, y: sumY / count };
	};

	// Get all selected stands with their calculated centroids
	const selectedStands = data.details
		.filter((d: any) => {
			const t = state.selectedEraldised[d.eraldisId];
			return t === 'LR' || t === 'HR';
		})
		.map((d: any) => {
			const centroid = getCentroid(d.geometry);
			return {
				...d,
				centroid,
			};
		});

	const getWmsUrls = (zoom: number, panOffset: Point) => {
		const [oMinX, oMinY, oMaxX, oMaxY] = data.bbox || [0, 0, 0, 0];
		const oWidth = oMaxX - oMinX;
		const oHeight = oMaxY - oMinY;

		const aspect = containerSize.width / containerSize.height;
		const oAspect = oWidth / oHeight;

		let w = oWidth;
		let h = oHeight;

		if (oAspect > aspect) {
			h = oWidth / aspect;
		} else {
			w = oHeight * aspect;
		}

		const wZoom = w / zoom;
		const hZoom = h / zoom;

		const oCx = oMinX + oWidth / 2;
		const oCy = oMinY + oHeight / 2;

		const cx = oCx + panOffset.x * oWidth;
		const cy = oCy + panOffset.y * oHeight;

		const bXMin = cx - wZoom / 2;
		const bYMin = cy - hZoom / 2;
		const bXMax = cx + wZoom / 2;
		const bYMax = cy + hZoom / 2;

		const bStr = `${bXMin},${bYMin},${bXMax},${bYMax}`;

		const wPx = Math.round(containerSize.width);
		const hPx = Math.round(containerSize.height);

		let baseMap = "";
		if (mapLayer === "EESTIFOTO") {
			baseMap = `https://kaart.maaamet.ee/wms/fotokaart?service=WMS&version=1.1.1&request=GetMap&layers=EESTIFOTO&styles=&bbox=${bStr}&width=${wPx}&height=${hPx}&srs=EPSG:3301&format=image/jpeg`;
		} else if (mapLayer === "METSAFOTO") {
			baseMap = `https://kaart.maaamet.ee/wms/alus?service=WMS&version=1.1.1&request=GetMap&layers=cir_ngr&styles=&bbox=${bStr}&width=${wPx}&height=${hPx}&srs=EPSG:3301&format=image/jpeg`;
		} else if (mapLayer === "DSM") {
			baseMap = `https://kaart.maaamet.ee/wms/fotokaart?service=WMS&version=1.1.1&request=GetMap&layers=nDSM&styles=&bbox=${bStr}&width=${wPx}&height=${hPx}&srs=EPSG:3301&format=image/jpeg`;
		}

		const boundaries = `https://gsavalik.envir.ee/geoserver/metsaregister/ows?service=WMS&version=1.1.1&request=GetMap&layers=metsaregister:eraldis&styles=&bbox=${bStr}&width=${wPx}&height=${hPx}&srs=EPSG:3301&format=image/png&transparent=true&cql_filter=${encodeURIComponent(`katastri_nr='${state.katastritunnus}'`)}`;

		return { baseMapUrl: baseMap, boundaryUrl: boundaries };
	};

	const getPercentCoords = (x: number, y: number) => {
		const pctX = ((x - minX) / (maxX - minX)) * 100;
		const pctY = (1 - (y - minY) / (maxY - minY)) * 100; // Invert Y
		return { x: pctX, y: pctY };
	};

	const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
		if (e.button !== 0) return; // Only pan on left click
		setIsDragging(true);
		setMouseDownPos({ x: e.clientX, y: e.clientY });
		setStartPan({ ...pan });
		setDragOffset({ x: 0, y: 0 });
		setHasDragged(false);
	};

	const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
		if (!isDragging) return;

		const dx = e.clientX - mouseDownPos.x;
		const dy = e.clientY - mouseDownPos.y;

		if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
			setHasDragged(true);
			setDragOffset({ x: dx, y: dy });
		}
	};

	const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
		if (!isDragging) return;
		setIsDragging(false);

		if (hasDragged) {
			const rect = e.currentTarget.getBoundingClientRect();
			
			// Delta conversion: screen pixels to L-EST97 center offset ratio
			const panXShift = (dragOffset.x / rect.width) / zoomLevel;
			const panYShift = (dragOffset.y / rect.height) / zoomLevel;

			const newPan = {
				x: Math.max(-0.8, Math.min(0.8, startPan.x - panXShift)),
				y: Math.max(-0.8, Math.min(0.8, startPan.y + panYShift)),
			};

			// Preload the WMS background map image to avoid "snap back" visual glitch
			setIsMapLoading(true);
			const { baseMapUrl } = getWmsUrls(zoomLevel, newPan);
			const img = new Image();
			img.src = baseMapUrl;
			const commitPan = () => {
				setPan(newPan);
				setDragOffset({ x: 0, y: 0 });
				setIsMapLoading(false);
			};
			img.onload = commitPan;
			img.onerror = commitPan;
		} else {
			// Click to place marker
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const clickY = e.clientY - rect.top;

			const pctX = clickX / rect.width;
			const pctY = clickY / rect.height;

			const x = minX + pctX * (maxX - minX);
			const y = maxY - pctY * (maxY - minY); // Invert Y

			setLanding({ x, y });
			setDragOffset({ x: 0, y: 0 });
		}
	};

	// Touch support for mobile/tablet drag-to-pan & click-to-place
	const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
		if (e.touches.length !== 1) return;
		const touch = e.touches[0];
		setIsDragging(true);
		setMouseDownPos({ x: touch.clientX, y: touch.clientY });
		setStartPan({ ...pan });
		setDragOffset({ x: 0, y: 0 });
		setHasDragged(false);
	};

	const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
		if (!isDragging || e.touches.length !== 1) return;
		const touch = e.touches[0];

		const dx = touch.clientX - mouseDownPos.x;
		const dy = touch.clientY - mouseDownPos.y;

		if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
			setHasDragged(true);
			setDragOffset({ x: dx, y: dy });
		}
	};

	const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
		if (!isDragging) return;
		setIsDragging(false);

		if (hasDragged) {
			const rect = e.currentTarget.getBoundingClientRect();
			const panXShift = (dragOffset.x / rect.width) / zoomLevel;
			const panYShift = (dragOffset.y / rect.height) / zoomLevel;

			const newPan = {
				x: Math.max(-0.8, Math.min(0.8, startPan.x - panXShift)),
				y: Math.max(-0.8, Math.min(0.8, startPan.y + panYShift)),
			};

			// Preload the WMS background map image to avoid "snap back" visual glitch
			setIsMapLoading(true);
			const { baseMapUrl } = getWmsUrls(zoomLevel, newPan);
			const img = new Image();
			img.src = baseMapUrl;
			const commitPan = () => {
				setPan(newPan);
				setDragOffset({ x: 0, y: 0 });
				setIsMapLoading(false);
			};
			img.onload = commitPan;
			img.onerror = commitPan;
		} else if (e.changedTouches.length > 0) {
			const touch = e.changedTouches[0];
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = touch.clientX - rect.left;
			const clickY = touch.clientY - rect.top;

			const pctX = clickX / rect.width;
			const pctY = clickY / rect.height;

			const x = minX + pctX * (maxX - minX);
			const y = maxY - pctY * (maxY - minY);

			setLanding({ x, y });
			setDragOffset({ x: 0, y: 0 });
		}
	};

	// Distance between two L-EST97 points in meters
	const calculateDistance = (p1: Point, p2: Point): number => {
		return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
	};

	// Calculate forwarding distances to landing
	const standsWithDistances = selectedStands.map((stand) => {
		let distance = 0;
		if (stand.centroid && landing) {
			distance = calculateDistance(stand.centroid, landing);
		}
		return {
			...stand,
			distance,
		};
	});

	// Calculate average forwarding distance
	const avgForwardingDistance = standsWithDistances.length > 0 && landing
		? standsWithDistances.reduce((sum, s) => sum + s.distance, 0) / standsWithDistances.length
		: 0;

	// Max forwarding distance
	const maxForwardingDistance = standsWithDistances.length > 0 && landing
		? Math.max(...standsWithDistances.map((s) => s.distance))
		: 0;

	// Access road distance (Landing on road to nearest stand center)
	const accessRoadDistance = landing && selectedStands.length > 0
		? Math.min(...standsWithDistances.map(s => s.centroid ? calculateDistance(s.centroid, landing) : Infinity))
		: 0;

	// Zoom Controls handlers
	const handleZoomIn = () => setZoomLevel(prev => Math.min(8, prev + 0.5));
	const handleZoomOut = () => {
		setZoomLevel(prev => {
			const nextZoom = Math.max(1, prev - 0.5);
			if (nextZoom === 1) {
				setPan({ x: 0, y: 0 }); // reset pan if zoom level returns to 1
			}
			return nextZoom;
		});
	};
	const handleReset = () => {
		setZoomLevel(1);
		setPan({ x: 0, y: 0 });
	};
	const handlePan = (dir: "up" | "down" | "left" | "right") => {
		const step = 0.15 / zoomLevel; // Pan speed scales down as you zoom in for higher precision
		setPan(prev => {
			let { x, y } = prev;
			if (dir === "up") y += step;
			if (dir === "down") y -= step;
			if (dir === "left") x -= step;
			if (dir === "right") x += step;
			
			// Limit pan scope so center doesn't go too far out of original bounding box
			x = Math.max(-0.8, Math.min(0.8, x));
			y = Math.max(-0.8, Math.min(0.8, y));
			
			return { x, y };
		});
	};

	// Save to state when landing, road quality or capacity changes
	useEffect(() => {
		if (landing) {
			setStorageLocation({
				landingCoords: landing,
				avgForwardingDistance,
				accessRoadDistance,
				roadQuality,
				yardCapacity,
			});
		}
	}, [landing]);

	const formatDistanceVal = (meters: number) => {
		if (meters === 0) return "Määramata";
		if (meters < 1000) {
			return `${Math.round(meters)} m`;
		}
		return `${(meters / 1000).toFixed(2)} km`;
	};

	// Dynamic WMS maps from Maa-amet based on zoomed/panned bbox
	const { baseMapUrl, boundaryUrl } = getWmsUrls(zoomLevel, pan);

	return (
		<div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto w-full">
			<div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col shadow-sm">
				
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
					<div>
						<h2 className="text-2xl font-bold text-slate-900">Ladustamine ja logistika</h2>
						<p className="text-slate-500 text-sm mt-1">Määra tee äärde vahelao asukoht. Täpsema asukoha leidmiseks kasuta suurendust</p>
					</div>
					<span className="self-start sm:self-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono font-bold border border-slate-200">
						{state.katastritunnus}
					</span>
				</div>

				<div className="flex flex-col gap-8">
					
					{/* Interactive Map Container */}
					<div className="w-full flex flex-col gap-4">
						
						{/* Mode Toggle Controls */}
						<div className="flex flex-wrap gap-2 items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
							<div className="flex gap-2">
								<div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm select-none">
									<MapPin size={14} className="text-emerald-600" />
									Vaheladu tee ääres
								</div>
							</div>
							
							{/* Layer switch */}
							<div className="flex gap-1">
								{(["EESTIFOTO", "METSAFOTO", "DSM"] as const).map((layer) => (
									<button
										key={layer}
										onClick={() => setMapLayer(layer)}
										className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer ${
											mapLayer === layer
												? "bg-slate-800 text-white"
												: "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
										}`}
									>
										{layer === "EESTIFOTO" ? "Foto" : layer === "METSAFOTO" ? "Mets" : "Kõrgus"}
									</button>
								))}
							</div>
						</div>

						{/* Map Viewport Container */}
						<div ref={mapRef} className="relative w-full aspect-[1000/600] md:aspect-[16/9] rounded-xl border border-slate-200 shadow-inner overflow-hidden select-none bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
							
							{/* Floating Zoom & Pan Controls overlay (Stays fixed outside the draggable wrapper) */}
							<div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-200">
								<div className="flex flex-col gap-1 items-center">
									<button 
										onClick={handleZoomIn} 
										className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center justify-center transition-colors cursor-pointer border border-slate-200/50" 
										title="Suurenda"
									>
										+
									</button>
									<span className="text-[9px] font-black font-mono text-slate-500 py-0.5">{zoomLevel.toFixed(1)}x</span>
									<button 
										onClick={handleZoomOut} 
										className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center justify-center transition-colors cursor-pointer border border-slate-200/50" 
										title="Vähenda"
									>
										-
									</button>
									<button 
										onClick={handleReset} 
										className="px-2 py-1 mt-1 text-[8px] font-black uppercase tracking-wider rounded bg-slate-800 text-white hover:bg-slate-900 transition-colors cursor-pointer" 
										title="Lähtesta vaade"
									>
										Reset
									</button>
								</div>
							</div>

							{/* Floating Pan D-Pad overlay (Stays fixed outside the draggable wrapper) */}
							<div className="absolute top-4 right-4 z-20 flex flex-col items-center bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-200">
								<span className="text-[8px] uppercase font-black tracking-wider text-slate-400 mb-1.5">Liigu kaardil</span>
								<div className="grid grid-cols-3 gap-1 w-24 h-24">
									<div />
									<button 
										onClick={() => handlePan("up")} 
										className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-700 cursor-pointer border border-slate-200/40"
									>
										▲
									</button>
									<div />
									<button 
										onClick={() => handlePan("left")} 
										className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-700 cursor-pointer border border-slate-200/40"
									>
										◀
									</button>
									<div className="w-7 h-7 flex items-center justify-center text-[10px] font-bold text-slate-400">
										PAN
									</div>
									<button 
										onClick={() => handlePan("right")} 
										className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-700 cursor-pointer border border-slate-200/40"
									>
										▶
									</button>
									<div />
									<button 
										onClick={() => handlePan("down")} 
										className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-700 cursor-pointer border border-slate-200/40"
									>
										▼
									</button>
								</div>
							</div>

							{/* Draggable Map Wrapper Container to translate all layers in sync */}
							<div 
								className="w-full h-full relative"
								style={{ 
									transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
									transition: "none"
								}}
							>
								{/* Base satellite photo (dynamically queries zoomed/panned WMS bounds) */}
								<img
									src={baseMapUrl}
									alt="Satellite background"
									className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
								/>
								{/* Property boundaries WMS overlay */}
								<img
									src={boundaryUrl}
									alt="Forest stands overlay"
									className="absolute inset-0 w-full h-full object-fill opacity-90 pointer-events-none select-none mix-blend-normal"
								/>

								{/* Dynamic SVG vector overlay */}
								<svg
									viewBox={`${minX} ${-maxY} ${maxX - minX} ${maxY - minY}`}
									preserveAspectRatio="none"
									className={`absolute inset-0 w-full h-full z-10 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
									onMouseDown={handleMouseDown}
									onMouseMove={handleMouseMove}
									onMouseUp={handleMouseUp}
									onTouchStart={handleTouchStart}
									onTouchMove={handleTouchMove}
									onTouchEnd={handleTouchEnd}
								>
								{/* Highlight and draw boundaries of selected stands */}
								{selectedStands.map((stand, index) => {
									if (!stand.geometry || !stand.geometry.coordinates) return null;
									
									const rings = stand.geometry.type === "Polygon"
										? stand.geometry.coordinates
										: stand.geometry.coordinates[0];
									
									const dStr = rings.map((ring: any) => {
										return "M " + ring.map(([x, y]: number[]) => `${x} ${-y}`).join(" L ") + " Z";
									}).join(" ");

									return (
										<path
											key={`${stand.eraldisId}-${index}`}
											d={dStr}
											fillRule="evenodd"
											className="fill-emerald-500/10 stroke-emerald-500 stroke-2 hover:fill-emerald-500/35 transition-colors"
											vectorEffect="non-scaling-stroke"
										/>
									);
								})}

								{/* Connecting dashed lines: stand centroids to landing */}
								{landing && selectedStands.map((stand, index) => {
									if (!stand.centroid) return null;
									return (
										<line
											key={`${stand.eraldisId}-${index}`}
											x1={stand.centroid.x}
											y1={-stand.centroid.y}
											x2={landing.x}
											y2={-landing.y}
											className="stroke-amber-600/60 stroke-2"
											strokeDasharray="4,4"
											vectorEffect="non-scaling-stroke"
										/>
									);
								})}
							</svg>

							{/* Absolute Positioned HTML Markers */}
							{/* 1. Centroid badges */}
							{selectedStands.map((stand, index) => {
								if (!stand.centroid) return null;
								
								// Calculate placement, hiding if outside zoomed bounds
								const pct = getPercentCoords(stand.centroid.x, stand.centroid.y);
								if (pct.x < 0 || pct.x > 100 || pct.y < 0 || pct.y > 100) return null;

								return (
									<div
										key={`${stand.eraldisId}-${index}`}
										className="absolute -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shadow border border-emerald-500/40 select-none pointer-events-none z-10"
										style={{ left: `${pct.x}%`, top: `${pct.y}%` }}
									>
										{stand.meta?.eraldise_nr || stand.eraldisId}
									</div>
								);
							})}

							{/* 2. Landing marker */}
							{landing && (() => {
								const pct = getPercentCoords(landing.x, landing.y);
								if (pct.x < 0 || pct.x > 100 || pct.y < 0 || pct.y > 100) return null;
								return (
									<div
										className="absolute -translate-x-1/2 flex flex-col items-center group z-20 pointer-events-none"
										style={{ left: `${pct.x}%`, top: `${pct.y}%` }}
									>
										{/* The pin visual with its bottom tip exactly at top: 0 coordinate */}
										<div className="relative -translate-y-full flex flex-col items-center">
											<div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border border-white scale-110">
												<MapPin size={16} />
											</div>
											{/* Small pointing triangle underneath the circle to mark exact click hot-spot */}
											<div className="w-2 h-2 bg-emerald-500 border-r border-b border-white rotate-45 -mt-1 shadow-sm" />
										</div>
										{/* Text badge sitting neatly below the coordinate hot-spot */}
										<span className="bg-emerald-950 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow border border-emerald-400/30 -mt-0.5 block">
											Vaheladu
										</span>
									</div>
								);
							})()}
							</div> {/* End of Draggable Map Wrapper */}

							{/* Compass & Attribution indicator */}
							<div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end gap-0.5 text-slate-500 font-mono text-[9px] pointer-events-none select-none font-bold z-10">
								<div className="flex items-center gap-1">
									<Compass size={11} className="animate-spin duration-[10000ms]" /> L-EST97
								</div>
								<span className="text-[8px] text-slate-400 font-sans tracking-wide">Kaart: Maa- ja Ruumiamet 2026</span>
							</div>

							{/* Help hint */}
							{!landing && !dismissedIntro && (
								<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center z-30">
									<div className="bg-white rounded-2xl p-6 shadow-xl max-w-xs border border-slate-100 flex flex-col items-center">
										<div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
											<MapPin size={24} className="animate-bounce" />
										</div>
										<h4 className="text-sm font-bold text-slate-900 mb-1">Määra puidu vaheladu</h4>
										<p className="text-xs text-slate-500 mb-4 leading-relaxed">
											Kasuta kaardi suurendust ja nooli, et leida täpne koht ja klõpsa kaardil vahelao määramiseks tee ääres.
										</p>
										<button 
											onClick={() => setDismissedIntro(true)} 
											className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
										>
											Sain aru
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Logistics Dashboard: Cards + Table */}
				{landing && standsWithDistances.length > 0 && (
					<div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
						
						{/* Header row with the average calculation */}
						<div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
									Logistika kalkulatsioon
								</h3>
								<p className="text-xs text-slate-500 mt-0.5">Eraldiste kokkuveo distantsid vahelaoni</p>
							</div>
							
							<div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
								<div className="flex flex-col text-right">
									<span className="text-[10px] uppercase font-bold text-slate-400">Keskmine kokkuveo kaugus</span>
								</div>
								<span className="text-lg font-black text-slate-900">{formatDistanceVal(avgForwardingDistance)}</span>
							</div>
						</div>

						{/* Stand-by-stand logistics table */}
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase">
									<tr>
										<th className="py-3 px-4 w-24">Eraldis</th>
										<th className="py-3 px-4">Pindala</th>
										<th className="py-3 px-4 text-right">Kokkuveo tee</th>
										<th className="py-3 px-4 text-slate-400"></th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{standsWithDistances.map((stand, index) => (
										<tr key={`${stand.eraldisId}-${index}`} className="hover:bg-slate-50">
											<td className="py-3 px-4 font-bold text-slate-900">
												Eraldis {stand.meta?.eraldise_nr || stand.eraldisId}
											</td>
											<td className="py-3 px-4 text-slate-600">
												{stand.pindala.toFixed(2)} ha
											</td>
											<td className="py-3 px-4 text-right font-semibold text-slate-900">
												{formatDistanceVal(stand.distance)}
											</td>
											<td className="py-3 px-4 text-xs text-slate-500">
												{stand.distance > 500 ? (
													<span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded font-medium">Pikk veo</span>
												) : (
													<span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded font-medium">Normaalne</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

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
					disabled={!landing}
					className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:bg-slate-300 disabled:pointer-events-none"
				>
					Edasi Kulude Juurde <ArrowRight size={18} />
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
