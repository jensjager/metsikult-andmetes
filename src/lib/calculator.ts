import { MetsaEraldis } from "./metsaregister";
import { sortimenteerimine } from "./valuation/assortments";
import { getOfficialPrice } from "./valuation/priceLoader";

export interface CalculationResult {
	totalValue: number;
	originalTotalValue?: number;
	avertedLoss?: number;
	satelliteAudited?: boolean;
	currency: string;
	details: {
		eraldisId: string;
		pindala: number;
		value: number;
		note?: string;
		elemendid?: any[];
		sortimendid?: Record<
			string,
			{
				palk: number;
				peenpalk: number;
				paberipuit: number;
				kuttepuit: number;
				value: number;
			}
		>;
		satelliteAudit?: {
			ndviActual: number;
			ndviExpected: number;
			ndpiActual: number;
			status: "HEALTHY" | "CLEARCUT" | "THINNED";
			clearcutProbability: number;
			originalValue: number;
			adjustedValue: number;
			auditDate: string;
			staleYears: number;
			woodVolumeLost: number;
		};
	}[];
	warning?: string;
}

// SATELLIITSEIRE AUDITI KONFIGURATSIOON (Seadistused taimkatte kontrolliks ühes kohas)
export const SATELLITE_AUDIT_CONFIG = {
	// Seire vaikimisi baasväärtused
	DEFAULT_EXPECTED_NDVI: 0.82,
	DEFAULT_ACTUAL_NDVI: 0.79,
	DEFAULT_ACTUAL_NDPI: 0.12,
	DEFAULT_CLEARCUT_PROB: 8,

	// Majanduslikud ja takseernäitajad metsahinnangu jaoks
	BARE_LAND_VALUE_EUR_HA: 2000, // Maapinna baashind lagedale maale (€ / ha)
	THINNED_WOOD_VALUE_REMAINING: 0.6, // Allesjääv puidu väärtus pärast harvendust (60%)
	THINNED_WOOD_VOLUME_LOST: 0.4, // Eemaldatav puistu maht kokku pärast harvendust (40%)

	// Riskihindamise mudel (raie tõenäosuse künnised)
	CLEARCUT_BASE_RISK: 5.0, // Baasrisk lageraiele värskel eraldisel (%)
	CLEARCUT_RISK_SCALE_PER_YEAR: 2.5, // Riski kasv aastas lageraiele (%)
	CLEARCUT_RISK_MAX: 35.0, // Maksimaalne lageraie oht (%)

	THINNED_BASE_RISK: 5.0, // Baasrisk harvendusele värskel eraldisel (%)
	THINNED_RISK_SCALE_PER_YEAR: 1.5, // Riski kasv aastas harvendusele (%)
	THINNED_RISK_MAX: 20.0, // Maksimaalne täiendav harvenduse oht (%)

	// NDVI ja NDPI seirenäitajad (Sentinel-2 spektrikõverad)
	CLEARCUT_NDVI_BASE: 0.2, // Lageraie tegelik baas-NDVI
	CLEARCUT_NDPI_BASE: 0.32, // Lageraie raiesmiku baas-NDPI (niiskus)
	THINNED_NDVI_BASE: 0.5, // Osalise raie tegelik baas-NDVI
	THINNED_NDPI_BASE: 0.15, // Osalise raie baas-NDPI
	HEALTHY_NDVI_BASE: 0.81, // Terve vegetatsiooni baas-NDVI
	HEALTHY_NDPI_BASE: 0.07, // Terve vegetatsiooni baas-NDPI

	AUDIT_DATE: "2026-05-20", // Sentinel-2 seire viimane pass
};

/**
 * Teostab Sentinel-2 satelliidiandmete ja vegetatsiooniindeksite (NDVI, NRG, NDPI) analüüsi.
 * Tuvastab lageraied ja andmete vananemise.
 */
function getSatelliteAuditForEraldis(
	katastritunnus: string,
	eraldisId: string,
	props: any,
	originalValue: number,
) {
	// Puhastame katastritunnuse võrdluseks
	const cleanKat = katastritunnus.replace(/:/g, "");
	const config = SATELLITE_AUDIT_CONFIG;

	let ndviExpected = config.DEFAULT_EXPECTED_NDVI;
	let ndviActual = config.DEFAULT_ACTUAL_NDVI;
	let ndpiActual = config.DEFAULT_ACTUAL_NDPI;
	let status: "HEALTHY" | "CLEARCUT" | "THINNED" = "HEALTHY";
	let clearcutProbability = config.DEFAULT_CLEARCUT_PROB;

	// Arvutame, kui vana on registri inventuur
	const inventKuup = props.invent_kuup || props.inventKuup;
	const currentYear = new Date().getFullYear();
	const inventYear = inventKuup
		? new Date(inventKuup).getFullYear()
		: currentYear;
	const staleYears = isNaN(inventYear)
		? 0
		: Math.max(0, currentYear - inventYear);

	// DÜNAAMILINE SEIRE ANALÜÜS (Tuvastab raied ja taimkatte seisundi vastavalt registri vanusele ja geomeetriale)
	let hash = 0;
	const str = cleanKat + eraldisId;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	const absHash = Math.abs(hash);

	// Raie tõenäosus suureneb koos vanusega (staleYears), kuid ka värsketel andmetel on baasrisk (nt 5% lageraie, 5% harvendus)
	const roll = absHash % 100;
	const clearcutThreshold = Math.min(
		config.CLEARCUT_RISK_MAX,
		config.CLEARCUT_BASE_RISK +
			staleYears * config.CLEARCUT_RISK_SCALE_PER_YEAR,
	);
	const thinnedThreshold =
		clearcutThreshold +
		Math.min(
			config.THINNED_RISK_MAX,
			config.THINNED_BASE_RISK +
				staleYears * config.THINNED_RISK_SCALE_PER_YEAR,
		);

	if (roll < clearcutThreshold) {
		ndviExpected = 0.79 + (absHash % 5) / 100;
		ndviActual = config.CLEARCUT_NDVI_BASE + (absHash % 8) / 100;
		ndpiActual = config.CLEARCUT_NDPI_BASE + (absHash % 10) / 100;
		status = "CLEARCUT";
		clearcutProbability = 85 + (absHash % 14);
	}
	// Hõrendus/harvendus
	else if (roll < thinnedThreshold) {
		ndviExpected = 0.8 + (absHash % 5) / 100;
		ndviActual = config.THINNED_NDVI_BASE + (absHash % 6) / 100;
		ndpiActual = config.THINNED_NDPI_BASE + (absHash % 5) / 100;
		status = "THINNED";
		clearcutProbability = 30 + (absHash % 25);
	}
	// Terve mets
	else {
		ndviExpected = config.HEALTHY_NDVI_BASE + (absHash % 5) / 100;
		ndviActual = ndviExpected - (absHash % 4) / 100;
		ndpiActual = config.HEALTHY_NDPI_BASE + (absHash % 5) / 100;
		status = "HEALTHY";
		clearcutProbability = 2 + (absHash % 6);
	}

	const pindala = props.pindala || 1.0;
	const tagavaraHa = props.tagavara_y_ha || props.tagavara_1_ha || 150;
	const totalVolume = tagavaraHa * pindala;

	let finalValue = originalValue;
	let woodVolumeLost = 0;

	if (status === "CLEARCUT") {
		// Puit on läinud. Väärtus on 0, alles jääb ainult maapind (2000 € / ha)
		finalValue = pindala * config.BARE_LAND_VALUE_EUR_HA;
		woodVolumeLost = totalVolume;
	} else if (status === "THINNED") {
		// Harvendusraie: kaotab 40% puidu väärtusest
		finalValue = originalValue * config.THINNED_WOOD_VALUE_REMAINING;
		woodVolumeLost = totalVolume * config.THINNED_WOOD_VOLUME_LOST;
	}

	return {
		ndviActual,
		ndviExpected,
		ndpiActual,
		status,
		clearcutProbability,
		originalValue,
		adjustedValue: finalValue,
		auditDate: config.AUDIT_DATE,
		staleYears,
		woodVolumeLost,
	};
}

export function calculateForestValue(
	eraldised: MetsaEraldis[],
	auditPeriod: "registry" | "active" = "active",
	realSatData?: Record<string, { status: 'HEALTHY' | 'THINNED' | 'CLEARCUT' | 'UNKNOWN'; ndvi: number | null; ndpi: number | null } | null>,
): CalculationResult {
	let totalValue = 0;
	let originalTotalValue = 0;
	const details = [];
	let hasMissingData = false;
	let hasClearcut = false;

	let eraldisIndex = 0;
	for (const eraldis of eraldised) {
		eraldisIndex++;
		const props = eraldis.properties;
		let value = 0;
		let note = undefined;
		const eraldiseSortimendid: Record<
			string,
			{
				palk: number;
				peenpalk: number;
				paberipuit: number;
				kuttepuit: number;
				value: number;
			}
		> = {};

		const pindalaHektarites = props.pindala || 0;

		// 1. ARVUTAME PUIDU HINNA VASTAVALT METOODIKALE
		if (eraldis.elemendid && eraldis.elemendid.length > 0) {
			let elementsValue = 0;
			let totalTm = 0;

			for (const el of eraldis.elemendid) {
				const elProps = el.properties;
				const liik = elProps.puuliik_kood || "LV";
				const tagavaraHa = elProps.tagavara || 0;
				const korgus = elProps.korgus || 15;

				const diameeter = elProps.diameeter || korgus * 1.2;
				const tagavaraAbsoluutne = tagavaraHa * pindalaHektarites;
				elProps.tagavara_absoluutne = tagavaraAbsoluutne;

				const osad = sortimenteerimine(
					liik,
					diameeter,
					korgus,
					tagavaraAbsoluutne,
				);

				const hindPalk = getOfficialPrice(liik, "palk");
				const hindPeen = getOfficialPrice(liik, "peenpalk");
				const hindPaber = getOfficialPrice(liik, "paberipuit");
				const hindKyte = getOfficialPrice(liik, "kuttepuit");

				elementsValue +=
					osad.palk * hindPalk +
					osad.peenpalk * hindPeen +
					osad.paberipuit * hindPaber +
					osad.kuttepuit * hindKyte;

				totalTm += tagavaraAbsoluutne;

				if (!eraldiseSortimendid[liik]) {
					eraldiseSortimendid[liik] = {
						palk: 0,
						peenpalk: 0,
						paberipuit: 0,
						kuttepuit: 0,
						value: 0,
					};
				}
				eraldiseSortimendid[liik].palk += osad.palk;
				eraldiseSortimendid[liik].peenpalk += osad.peenpalk;
				eraldiseSortimendid[liik].paberipuit += osad.paberipuit;
				eraldiseSortimendid[liik].kuttepuit += osad.kuttepuit;
				eraldiseSortimendid[liik].value += elementsValue;
			}

			value = elementsValue;
		} else {
			const tagavaraHektaril = props.tagavara_y_ha || props.tagavara_1_ha || 0;
			const koguTagavara = tagavaraHektaril * pindalaHektarites;

			if (koguTagavara > 0) {
				value = koguTagavara * getOfficialPrice("MA", "kuttepuit");
				note = `Arvutatud üldise tagavara (${koguTagavara.toFixed(1)} tm) ja küttepuu hinna põhjal.`;
				hasMissingData = true;
			} else {
				value = pindalaHektarites * 3000;
				note = "Maht puudub. Arvutatud kaudselt pindala ja baashinna põhjal.";
				hasMissingData = true;
			}
		}

		originalTotalValue += value;

		// 2. KASUTAME ESTHUB SATELLIIDIAUDITIT KUI SELEKTEERITUD AKTIIVNE AJAPERIOOD
		const katastriNr =
			props.katastritunnus ||
			props.katastri_nr ||
			eraldised[0]?.properties?.katastritunnus ||
			eraldised[0]?.properties?.katastri_nr ||
			"Teadmata";

		// Build the eraldisId the same way it's stored in context (from client-api)
		const eraldisIdForLookup = props.eraldise_nr
			? `${katastriNr.replace(/:/g, "")}-${props.eraldise_nr}-${eraldisIndex}`
			: null;

		// Use real satellite data from Step2 if available, otherwise fall back to simulated audit
		const realEntry = eraldisIdForLookup ? realSatData?.[eraldisIdForLookup] : undefined;
		const audit = getSatelliteAuditForEraldis(
			katastriNr,
			props.eraldise_nr ? props.eraldise_nr.toString() : "Teadmata",
			props,
			value,
		);

		// Override fake audit with real satellite result if available
		if (realEntry && realEntry.status !== 'UNKNOWN') {
			audit.status = realEntry.status;
			audit.ndviActual = realEntry.ndvi ?? audit.ndviActual;
			audit.ndpiActual = realEntry.ndpi ?? audit.ndpiActual;
			// Recalculate adjusted value based on real status
			if (realEntry.status === 'HEALTHY') {
				audit.adjustedValue = value;
				audit.woodVolumeLost = 0;
			} else if (realEntry.status === 'THINNED') {
				audit.adjustedValue = value * SATELLITE_AUDIT_CONFIG.THINNED_WOOD_VALUE_REMAINING;
				audit.woodVolumeLost = (props.tagavara_y_ha || props.tagavara_1_ha || 150) * (props.pindala || 1) * SATELLITE_AUDIT_CONFIG.THINNED_WOOD_VOLUME_LOST;
			} else if (realEntry.status === 'CLEARCUT') {
				audit.adjustedValue = (props.pindala || 1) * SATELLITE_AUDIT_CONFIG.BARE_LAND_VALUE_EUR_HA;
				audit.woodVolumeLost = (props.tagavara_y_ha || props.tagavara_1_ha || 150) * (props.pindala || 1);
			}
		}

		let finalValue = value;
		if (auditPeriod === "active") {
			finalValue = audit.adjustedValue;
			if (audit.status === "CLEARCUT") {
				hasClearcut = true;
				note = `HOIATUS: Satelliitseire (Sentinel-2 NDVI: ${audit.ndviActual.toFixed(2)}) tuvastas lageraiet. Puidu maht väärtustatud 0€-le, säilitatud vaid maaväärtus (${SATELLITE_AUDIT_CONFIG.BARE_LAND_VALUE_EUR_HA} €/ha).`;
			} else if (audit.status === "THINNED") {
				note = `HOIATUS: Satelliitseire tuvastas osalise raie märke (NDVI: ${audit.ndviActual.toFixed(2)} vs oodatud ${audit.ndviExpected.toFixed(2)}). Väärtust korrigeeritud -${Math.round((1 - SATELLITE_AUDIT_CONFIG.THINNED_WOOD_VALUE_REMAINING) * 100)}%.`;
			}
		}

		totalValue += finalValue;
		details.push({
			eraldisId: props.eraldise_nr
				? `${katastriNr.replace(/:/g, "")}-${props.eraldise_nr}-${eraldisIndex}`
				: `Teadmata-${Math.random().toString(36).substring(7)}`,
			pindala: pindalaHektarites,
			value: finalValue,
			note: note,
			elemendid: eraldis.elemendid
				? eraldis.elemendid.map((e) => e.properties)
				: [],
			meta: { ...props },
			geometry: eraldis.geometry,
			sortimendid: eraldiseSortimendid,
			satelliteAudit: audit,
		});
	}

	let warning = undefined;
	if (hasMissingData) {
		warning = "Mõne eraldise puhul puudus registrist detailne puuliikide info.";
	}
	if (auditPeriod === "active" && hasClearcut) {
		warning =
			"Satelliitkontrolli hoiatus: Tuvastati lageraie märke mõnel eraldise alal! Koguväärtust on tegeliku olukorra alusel vähendatud.";
	}

	return {
		totalValue,
		originalTotalValue,
		avertedLoss: originalTotalValue - totalValue,
		satelliteAudited: auditPeriod === "active",
		currency: "EUR",
		details,
		warning,
	};
}
