// Simple client for NASA Exoplanet Archive TAP API
// Fetch by Kepler ID (kepid) or generic target string

export interface ExoplanetRecord {
  pl_name?: string;
  pl_rade?: number; // Planet radius [Earth radii]
  pl_masse?: number; // Planet mass [Earth masses]
  st_teff?: number; // Stellar effective temperature [K]
  st_rad?: number; // Stellar radius [Solar radii]
  sy_dist?: number; // Distance [pc]
}

const DIRECT_BASE_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";
const PROXY_URL = "/api/exoplanet-proxy";

function buildTapQuery(params: { kepid?: string; target?: string }): string {
  // Use pscomppars table (composite parameters for confirmed/candidate planets)
  // Select a handful of useful columns
  const selectCols = [
    "pl_name",
    "pl_rade",
    "pl_masse",
    "st_teff",
    "st_rad",
    "sy_dist"
  ].join(",");

  let where = "";
  const normalize = (v?: string) => (v || "").trim();
  const isNumeric = (v?: string) => !!v && /^\d+$/.test(normalize(v));
  const useVal = normalize(params.kepid) || normalize(params.target);
  const lower = useVal.toLowerCase();

  if (lower.startsWith("kic ") || lower === "kic") {
    const num = useVal.replace(/[^0-9]/g, "");
    if (num) {
      where = `where kepid=${num}`;
    }
  } else if (lower.startsWith("tic ") || lower === "tic") {
    const num = useVal.replace(/[^0-9]/g, "");
    if (num) {
      where = `where tic_id=${num}`;
    }
  } else if (isNumeric(useVal)) {
    // Try both common numeric ids: TIC or KIC
    where = `where (tic_id=${useVal} OR kepid=${useVal})`;
  } else if (useVal) {
    where = `where lower(pl_name) like '%${encodeURIComponent(lower)}%'`;
  }

  const query = `select ${selectCols} from pscomppars ${where}`.trim();
  return query;
}

export async function fetchExoplanets(options: {
  apiKey?: string; // Not required by Exoplanet Archive, accepted for future use
  kepid?: string;
  target?: string;
}): Promise<ExoplanetRecord[]> {
  const primaryQuery = buildTapQuery({ kepid: options.kepid, target: options.target });

  // Prepare robust fallbacks across common tables/columns
  const q = (s: string) => `${PROXY_URL}?query=${encodeURIComponent(s)}&format=json`;
  const queries: string[] = [];

  // 1) Primary pscomppars query
  queries.push(primaryQuery);

  // 2) Fallbacks: try alternate ids and table ps
  const raw = (options.kepid || options.target || '').trim();
  const num = raw.replace(/[^0-9]/g, '');
  const lower = raw.toLowerCase();

  if (num) {
    queries.push(`select pl_name,pl_rade,pl_masse,st_teff,st_rad,sy_dist from pscomppars where kepid=${num}`);
    queries.push(`select pl_name,pl_rade,pl_masse,st_teff,st_rad,sy_dist from pscomppars where tic_id=${num}`);
    queries.push(`select pl_name,pl_rade,pl_masse,st_teff,st_rad,sy_dist from ps where pl_name like '%${num}%'`);
  }
  if (lower && !num) {
    queries.push(`select pl_name,pl_rade,pl_masse,st_teff,st_rad,sy_dist from ps where lower(pl_name) like '%${encodeURIComponent(lower)}%'`);
  }
  // 3) Last resort: return some small dataset to keep UI working
  queries.push(`select pl_name,pl_rade,pl_masse,st_teff,st_rad,sy_dist from ps fetch first 10 rows only`);

  let firstError: string | null = null;

  for (const query of queries) {
    try {
      let response: Response;
      try {
        response = await fetch(q(query));
      } catch (e: any) {
        // Proxy network failure: try direct
        const directUrl = `${DIRECT_BASE_URL}?query=${encodeURIComponent(query)}&format=json`;
        response = await fetch(directUrl);
      }
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        firstError = firstError || `HTTP ${response.status} ${body.slice(0, 300)}`;
        continue;
      }
      const data = (await response.json()) as ExoplanetRecord[];
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err: any) {
      firstError = firstError || (err?.message || 'Unknown error');
      continue;
    }
  }

  // If all attempts failed or returned empty, throw detailed error
  throw new Error(`Exoplanet API could not return results. ${firstError || ''}`.trim());
}

export function mapToAppPlanet(records: ExoplanetRecord[]) {
  // Map to the app's planet structure used on Index/visualizers
  return records.map((item, idx) => ({
    id: idx + 1,
    name: item.pl_name || `Planet ${idx + 1}`,
    probability: 0.5,
    radius: typeof item.pl_rade === "number" ? item.pl_rade : 1,
    distanceFromStar: 1 + (idx % 5) * 0.2,
    hasWater: false,
    hasAtmosphere: true,
    isHabitable: (item.pl_rade || 0) > 0.8 && (item.pl_rade || 0) < 1.6,
    color: "#3B82F6",
    type: "Rocky",
    temperature: item.st_teff || 288,
    confidence: 0.7,
    datasetInfo: {
      timePoints: records.length,
      fluxPoints: 0,
      timeRange: 0,
      fluxMean: 0,
      fluxMin: 0,
      fluxMax: 0,
      fluxStdDev: 0,
    },
    massEarth: item.pl_masse,
    radiusEarth: item.pl_rade,
    starTempK: item.st_teff,
    starRadiusSol: item.st_rad,
    distancePc: item.sy_dist,
  }));
}


