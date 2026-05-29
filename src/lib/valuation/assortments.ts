import { calculateAssortmentVolume, calculateTotalTreeVolume } from './ozolins';

export interface Assortments {
  palk: number;
  peenpalk: number;
  paberipuit: number;
  kuttepuit: number;
}

/**
 * Arvutab puistuelemendi (puuliigi) tagavara jaotuse sortimentideks.
 * Kasutab R. Ozolinši tüvemoodustaja integraale (Lisa 6), et leida tüve 
 * ala-, kesk- ja ladvaosa mahud ning proportsioonid.
 */
export function sortimenteerimine(puuliik: string, d: number, h: number, tagavara: number): Assortments {
  // Kui puu on liiga peenike või lühike, läheb kogu maht kütteks.
  if (d < 8 || h < 5) {
    return { palk: 0, peenpalk: 0, paberipuit: 0, kuttepuit: tagavara };
  }

  // Ametlikus metoodikas otsitakse iga sortimendi piiri millimeetri haaval.
  // Häkatoni/MVP raames kasutame suhtelisi tüvekõrgusi, mida me 
  // integreerime täpsete Ozolinši polünoomidega.
  const h_palk = h * 0.4;
  const h_peen = h * 0.6;
  const h_paber = h * 0.8;

  const v_total = calculateTotalTreeVolume(puuliik, h, d);
  if (v_total === 0) {
    return { palk: 0, peenpalk: 0, paberipuit: 0, kuttepuit: tagavara };
  }

  // 0.1 on kännu kõrguse lähend (HS = 0.1)
  const v_palk = calculateAssortmentVolume(puuliik, h, d, 0.1, h_palk);
  const v_peen = calculateAssortmentVolume(puuliik, h, d, h_palk, h_peen);
  const v_paber = calculateAssortmentVolume(puuliik, h, d, h_peen, h_paber);
  const v_kyte = calculateAssortmentVolume(puuliik, h, d, h_paber, h);

  const sum = v_palk + v_peen + v_paber + v_kyte;
  
  if (sum <= 0) {
    return { palk: 0, peenpalk: 0, paberipuit: 0, kuttepuit: tagavara };
  }

  // Rakendame leitud proportsioone reaalsele inventeeritud tagavarale
  return {
    palk: tagavara * (v_palk / sum),
    peenpalk: tagavara * (v_peen / sum),
    paberipuit: tagavara * (v_paber / sum),
    kuttepuit: tagavara * (v_kyte / sum)
  };
}
