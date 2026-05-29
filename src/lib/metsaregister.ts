export interface MetsaEraldis {
	id: string;
	properties: {
		katastritunnus: string;
		eraldis: string;
		pindala: number;
		peapuuliik?: string;
		arenguklass?: string;
		vanus?: number;
		kogu_tagavara?: number; // Võib olla puudu
		tihumeetrid?: number; // Kasutame eelkõige tagavara info jaoks
		[key: string]: any; // Muud võimalikud andmeväljad
	};
	elemendid?: EraldisElement[]; // Lisatud: puuliikide detailsed andmed
}

export interface EraldisElement {
	id: string;
	properties: {
		eraldis_id: number;
		rinne_kood?: string;
		puuliik_kood?: string;
		osakaal?: number;
		vanus?: number;
		korgus?: number;
		tagavara?: number; // Maht (tm)
		arv?: number; // Puude arv
		[key: string]: any;
	};
}

export interface MetsaregisterElementResponse {
	type: string;
	features: EraldisElement[];
	totalFeatures: number;
}

export interface MetsaregisterResponse {
	type: string;
	features: MetsaEraldis[];
	totalFeatures: number;
}

/**
 * Teeb päringu Metsaregistri WFS teenusesse ja tagastab katastritunnusele vastavad metsaeraldised.
 */
export async function getEraldisedByKatastritunnus(
	katastritunnus: string,
): Promise<MetsaEraldis[]> {
	try {
		// URL-kodeerime katastritunnuse, et vältida vigaseid päringuid
		const cqlFilter = encodeURIComponent(`katastri_nr='${katastritunnus}'`);

		// WFS päring JSON formaadis (eemaldatud maxFeatures, et tuua KÕIK antud katastri eraldised)
		const url = `https://gsavalik.envir.ee/geoserver/metsaregister/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=metsaregister:eraldis&outputFormat=application/json&cql_filter=${cqlFilter}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
			next: { revalidate: 3600 }, // Vahemällu salvestamine 1 tunniks, sest eraldised ei muutu nii tihti
		});

		if (!response.ok) {
			throw new Error(
				`Metsaregistri päring ebaõnnestus: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as MetsaregisterResponse;
		return data.features || [];
	} catch (error) {
		console.error("Viga Metsaregistri andmete laadimisel:", error);
		throw error;
	}
}

/**
 * Teeb päringu eraldis_element kihti ja toob mitme eraldise puuliikide detailsed andmed korraga.
 */
export async function getEraldisElemendid(
	eraldisIds: number[],
): Promise<EraldisElement[]> {
	if (!eraldisIds || eraldisIds.length === 0) return [];

	try {
		const idList = eraldisIds.join(",");
		const cqlFilter = encodeURIComponent(`eraldis_id IN (${idList})`);

		// Teeme päringu ilma maxFeatures piiranguta, kuna elementide arv võib suure katastri puhul ületada sadu
		const url = `https://gsavalik.envir.ee/geoserver/metsaregister/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=metsaregister:eraldis_element&outputFormat=application/json&cql_filter=${cqlFilter}`;

		const response = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json" },
			next: { revalidate: 3600 },
		});

		if (!response.ok) {
			throw new Error(`Elemendi päring ebaõnnestus: ${response.status}`);
		}

		const data = (await response.json()) as MetsaregisterElementResponse;
		return data.features || [];
	} catch (error) {
		console.error("Viga elementide laadimisel:", error);
		return []; // Kui ebaõnnestub, tagastame tühja massiivi, et põhipäring ei katkeks
	}
}
