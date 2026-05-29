import officialPrices from './official_prices.json';

/**
 * Leiab Excelist loetud ametlike hindade seast puuliigile ja sortimendile vastava keskmise hinna.
 */
export function getOfficialPrice(puuliik: string, sortiment: 'palk' | 'peenpalk' | 'paberipuit' | 'kuttepuit'): number {
  const liikMap: Record<string, string> = {
    "MA": "männi",
    "KU": "kuuse",
    "KS": "kase",
    "HB": "haava",
    "LM": "sanglepa",
    "LV": "hall-lepa",
    "TA": "tamme",
    "SA": "saare"
  };

  // Küttepuit on universaalne
  if (sortiment === 'kuttepuit') {
    return (officialPrices as any)["küttepuit"] || 19.59;
  }

  const prefix = liikMap[puuliik];
  if (!prefix) {
    // Kui puuliigile pole oma spetsiifilist palki/paberit antud (nt lepp), hindame selle küttepuuks
    return (officialPrices as any)["küttepuit"] || 19.59;
  }

  const key = prefix + sortiment; // nt "männipalk" või "kuusepeenpalk"
  
  if (key in officialPrices) {
    return (officialPrices as any)[key];
  }

  // Tagavara lahendus, kui võtit ei leita
  return (officialPrices as any)["küttepuit"] || 19.59;
}
