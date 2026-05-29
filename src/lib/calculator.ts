import { MetsaEraldis } from "./metsaregister";
import { sortimenteerimine } from "./valuation/assortments";
import { getOfficialPrice } from "./valuation/priceLoader";

export interface CalculationResult {
  totalValue: number;
  currency: string;
  details: {
    eraldisId: string;
    pindala: number;
    value: number;
    note?: string;
    elemendid?: any[];
    sortimendid?: Record<string, {
      palk: number;
      peenpalk: number;
      paberipuit: number;
      kuttepuit: number;
      value: number;
    }>;
  }[];
  warning?: string;
}

export function calculateForestValue(eraldised: MetsaEraldis[]): CalculationResult {
  let totalValue = 0;
  const details = [];
  let hasMissingData = false;

  for (const eraldis of eraldised) {
    const props = eraldis.properties;
    let value = 0;
    let note = undefined;
    const eraldiseSortimendid: Record<string, { palk: number; peenpalk: number; paberipuit: number; kuttepuit: number; value: number }> = {};

    const pindalaHektarites = props.pindala || 0;
    
    // 1. KASUTAME UUT AMETLIKKU SORTIMENTEERIMISE LOOGIKAT (LISA 5 ja 6)
    if (eraldis.elemendid && eraldis.elemendid.length > 0) {
      let elementsValue = 0;
      let totalTm = 0;
      
      for (const el of eraldis.elemendid) {
        const elProps = el.properties;
        const liik = elProps.puuliik_kood || "LV"; // Vaikimisi lepp
        const tagavaraHa = elProps.tagavara || 0;
        const korgus = elProps.korgus || 15; 
        
        // Diameeter on tihti andmetes olemas (diameeter). Kui puudub, teeme lihtsa hinnangu kõrguse pealt.
        const diameeter = elProps.diameeter || (korgus * 1.2); 
        
        const tagavaraAbsoluutne = tagavaraHa * pindalaHektarites;
        elProps.tagavara_absoluutne = tagavaraAbsoluutne; // Salvestame UI jaoks
        
        // Jagame elemendi mahu sortimentideks (R. Ozolinši mudel)
        const osad = sortimenteerimine(liik, diameeter, korgus, tagavaraAbsoluutne);
        
        // Leiame iga sortimendi hinna (Metsamaterjali_hinnastatistika_04_2026.xlsx)
        const hindPalk = getOfficialPrice(liik, 'palk');
        const hindPeen = getOfficialPrice(liik, 'peenpalk');
        const hindPaber = getOfficialPrice(liik, 'paberipuit');
        const hindKyte = getOfficialPrice(liik, 'kuttepuit');

        // Arvutame selle elemendi väärtuse
        elementsValue += (osad.palk * hindPalk) + 
                         (osad.peenpalk * hindPeen) + 
                         (osad.paberipuit * hindPaber) + 
                         (osad.kuttepuit * hindKyte);
                         
        totalTm += tagavaraAbsoluutne;
        
        // Salvestame kuvamiseks puuliikide kaupa
        if (!eraldiseSortimendid[liik]) {
          eraldiseSortimendid[liik] = { palk: 0, peenpalk: 0, paberipuit: 0, kuttepuit: 0, value: 0 };
        }
        eraldiseSortimendid[liik].palk += osad.palk;
        eraldiseSortimendid[liik].peenpalk += osad.peenpalk;
        eraldiseSortimendid[liik].paberipuit += osad.paberipuit;
        eraldiseSortimendid[liik].kuttepuit += osad.kuttepuit;
        eraldiseSortimendid[liik].value += elementsValue;
      }
      
      value = elementsValue;
      note = `Arvutatud ametliku metoodika (Lisa 6 Ozolinši tüvemudel) alusel. Kokku ${totalTm.toFixed(1)} tm, jagatud sortimentideks.`;
    } 
    else {
      // VANA LOOGIKA (kui elemente pole)
      const tagavaraHektaril = props.tagavara_y_ha || props.tagavara_1_ha || 0;
      const koguTagavara = tagavaraHektaril * pindalaHektarites;
      
      if (koguTagavara > 0) {
        value = koguTagavara * getOfficialPrice('MA', 'kuttepuit'); // anname default küttepuu hinna
        note = `Puuliikide jaotus puudu. Arvutatud üldise tagavara (${koguTagavara.toFixed(1)} tm) ja küttepuu hinna põhjal.`;
        hasMissingData = true;
      } else {
        value = pindalaHektarites * 3000;
        note = "Maht (tm) puudub. Arvutatud kaudselt pindala ja baashinna põhjal.";
        hasMissingData = true;
      }
    }

    totalValue += value;
    details.push({
      eraldisId: props.eraldise_nr ? props.eraldise_nr.toString() : "Teadmata",
      pindala: pindalaHektarites,
      value: value,
      note: note,
      elemendid: eraldis.elemendid ? eraldis.elemendid.map(e => e.properties) : [],
      meta: { ...props },
      sortimendid: eraldiseSortimendid
    });
  }

  let warning = undefined;
  if (hasMissingData) {
    warning = "Mõne eraldise puhul ei olnud detailset puuliikide infot. Nende väärtus arvutati lihtsustatult.";
  }

  return {
    totalValue,
    currency: "EUR",
    details,
    warning
  };
}
