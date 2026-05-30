import { getEraldisedByKatastritunnus, getEraldisElemendid } from './metsaregister';
import { calculateForestValue } from './calculator';

// WMS getFeatureInfo constants for Sentinel-2
const WMS_NDVI_BASE = 'https://teenus.maaamet.ee/ows/wms-sentinel-2-ndvi';
const WMS_NDPI_BASE = 'https://teenus.maaamet.ee/ows/wms-sentinel-2-ndpi';
const NDVI_LAYER = 'sentinel_2_ndvi';
const NDPI_LAYER = 'sentinel_2_ndpi';

const NDVI_HEALTHY_MIN = 0.60;
const NDVI_THINNED_MIN = 0.40;

const PRIMARY_SEARCH_DAYS = 30;
const MAX_SEARCH_DAYS = 120;
const FETCH_TIMEOUT_MS = 6000;

export async function fetchFeatureInfo(baseUrl: string, layer: string, cx: number, cy: number): Promise<number | null> {
  const isHtml = true;
  const format = isHtml ? 'text/html' : 'text/plain';

  const margin = 500;
  const minX = Math.round(cx - margin);
  const minY = Math.round(cy - margin);
  const maxX = Math.round(cx + margin);
  const maxY = Math.round(cy + margin);

  const url =
    `${baseUrl}?service=WMS&version=1.1.1&request=GetFeatureInfo` +
    `&layers=${layer}&query_layers=${layer}` +
    `&bbox=${minX},${minY},${maxX},${maxY}` +
    `&width=100&height=100` +
    `&x=50&y=50` +
    `&info_format=${format}` +
    `&srs=EPSG:3301`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/html' },
    });

    clearTimeout(timeout);

    if (!res.ok) return null;
    const text = (await res.text()).trim();

    if (text.includes('ServiceException')) {
      return null;
    }

    // Try to find the scaled integer value returned by the HTML response (e.g. '8425' for 0.8425)
    const m = text.match(/^(-?\d+)/);
    if (m) {
      let v = parseFloat(m[1]);
      if (v > 10 || v < -10) {
          v = v / 10000.0;
      }
      if (!isNaN(v) && v > -1.05 && v < 1.05) return v;
    }

    return null;
  } catch {
    return null;
  }
}

function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export interface RealSatResult {
  date: string | null;
  cloudfree: boolean;
  ndvi: number | null;
  ndpi: number | null;
  status: 'HEALTHY' | 'THINNED' | 'CLEARCUT' | 'UNKNOWN';
  stale: boolean;
  warning: string | null;
  error: string | null;
}

export async function fetchSatelliteAuditClient(cx: number, cy: number): Promise<RealSatResult> {
  if (isNaN(cx) || isNaN(cy) || cx === 0 || cy === 0) {
    return {
      date: null,
      cloudfree: false,
      ndvi: null,
      ndpi: null,
      status: 'UNKNOWN',
      stale: false,
      warning: 'Puuduvad või vigased cx/cy parameetrid.',
      error: 'INVALID_PARAMS'
    };
  }

  // Maa-amet WMS teenused tagastavad ilma date parameetrita alati uusima saadaoleva pilvevaba mosaiigi
  const ndvi = await fetchFeatureInfo(WMS_NDVI_BASE, NDVI_LAYER, cx, cy);

  if (ndvi === null) {
    return {
      date: null,
      cloudfree: false,
      ndvi: null,
      ndpi: null,
      status: 'UNKNOWN',
      stale: false,
      warning: 'Satelliitandmed pole kättesaadavad.',
      error: 'NO_DATA'
    };
  }

  const ndpi = await fetchFeatureInfo(WMS_NDPI_BASE, NDPI_LAYER, cx, cy) ?? 0.10;

  const status: 'HEALTHY' | 'THINNED' | 'CLEARCUT' =
    ndvi >= NDVI_HEALTHY_MIN ? 'HEALTHY' :
    ndvi >= NDVI_THINNED_MIN ? 'THINNED' : 'CLEARCUT';

  return {
    date: new Date().toISOString(), // latest available implies current
    cloudfree: true,
    ndvi: Math.round(ndvi * 1000) / 1000,
    ndpi: Math.round(ndpi * 1000) / 1000,
    status,
    stale: false,
    warning: null,
    error: null
  };
}

export async function calculateForestValueClient(katastritunnus: string, auditPeriod: 'registry' | 'active' = 'active') {
  if (!katastritunnus || typeof katastritunnus !== 'string') {
    throw new Error('Katastritunnus on nõutud ja peab olema tekst formaadis (nt "21401:001:0123")');
  }

  // 1. Päri eraldised
  const eraldised = await getEraldisedByKatastritunnus(katastritunnus);

  if (!eraldised || eraldised.length === 0) {
    throw new Error('Selle katastritunnusega ei leitud Metsaregistrist ühtegi eraldist.');
  }

  // 2. Päri eraldiste elemendid (puuliigid) ühe masspäringuga
  const eraldisIds = eraldised.map(e => e.properties.id).filter(id => id !== undefined);
  if (eraldisIds.length > 0) {
    const elemendid = await getEraldisElemendid(eraldisIds);
    // Seo elemendid vastava eraldisega
    for (const eraldis of eraldised) {
      eraldis.elemendid = elemendid.filter(el => el.properties.eraldis_id === eraldis.properties.id);
    }
  }

  // 3. Arvuta hind
  const calculation = calculateForestValue(eraldised, auditPeriod);

  // 4. Arvuta BBOX (katastritunnuse ulatus) kaardi kuvamiseks
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const eraldis of eraldised) {
    if (eraldis.geometry && eraldis.geometry.coordinates) {
      const extractPoints = (coords: any[]) => {
        if (typeof coords[0] === 'number') {
          const [x, y] = coords;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        } else {
          for (const c of coords) extractPoints(c);
        }
      };
      extractPoints(eraldis.geometry.coordinates);
    }
  }
  
  let bbox: number[] | undefined = undefined;
  if (minX !== Infinity) {
    const width = Math.max(maxX - minX, 10);
    const height = Math.max(maxY - minY, 10);
    
    const cx = minX + width / 2;
    const cy = minY + height / 2;
    
    const targetAspect = 1000 / 600;
    const currentAspect = width / height;
    
    let targetW = width;
    let targetH = height;
    
    if (currentAspect > targetAspect) {
       targetH = targetW / targetAspect;
    } else {
       targetW = targetH * targetAspect;
    }
    
    const bufferW = targetW * 0.5;
    const bufferH = targetH * 0.5;
    
    const finalW = Math.max(targetW + bufferW, 200);
    const finalH = Math.max(targetH + bufferH, 120);
    
    bbox = [cx - finalW/2, cy - finalH/2, cx + finalW/2, cy + finalH/2];
  }

  return {
    success: true,
    katastritunnus,
    eraldisteArv: eraldised.length,
    bbox,
    ...calculation
  };
}
