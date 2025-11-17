/**
 * Enhanced Exoplanet API service with support for:
 * - NASA Exoplanet Archive API
 * - Google Sheets integration
 * - Direct CSV upload
 * Uses ML model predictions to validate and enrich data
 */

import { mlModelService, ModelPrediction } from './mlModelService';

export interface ExoplanetData {
  id: string;
  name: string;
  // Orbital parameters
  orbitalPeriodDays: number;
  semiMajorAxisAU: number;
  // Planet parameters
  radiusEarth: number;
  massEarth?: number;
  // Star parameters
  starTempK: number;
  starRadiusSolar: number;
  starMassSolar?: number;
  // Derived properties
  equilibriumTempK: number;
  surfaceGravity: number;
  inHabitableZone: boolean;
  // ML predictions (if available)
  mlPrediction?: ModelPrediction;
  dataSource: 'nasa' | 'sheets' | 'csv' | 'user-input';
  confidence: number;
}

const NASA_ARCHIVE_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";
const FALLBACK_TIMEOUT = 5000;

class EnhancedExoplanetService {
  /**
   * Fetch from NASA Exoplanet Archive
   */
  async fetchFromNASA(
    options: { 
      target?: string; 
      kepid?: string; 
      apiKey?: string;
      enableMLValidation?: boolean;
    } = {}
  ): Promise<ExoplanetData[]> {
    try {
      const query = this.buildNASAQuery(options.target || options.kepid || '');
      const url = `${NASA_ARCHIVE_URL}?query=${encodeURIComponent(query)}&format=json`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`NASA API error: ${response.status}`);
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No results from NASA API");
      }
      
      return this.mapNASAToExoplanetData(data, options.enableMLValidation);
    } catch (error) {
      console.warn("NASA API fetch failed:", error);
      throw error;
    }
  }

  /**
   * Parse Google Sheets data
   */
  async fetchFromGoogleSheets(
    options: {
      sheetId: string;
      sheetName?: string;
      apiKey: string;
      enableMLValidation?: boolean;
    }
  ): Promise<ExoplanetData[]> {
    try {
      const sheetName = options.sheetName || 'Sheet1';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${options.sheetId}/values/${sheetName}?key=${options.apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Google Sheets API error: ${response.status}`);
      
      const result = await response.json();
      const rows = result.values || [];
      
      if (rows.length < 2) throw new Error("Google Sheet must have headers and data");
      
      return this.mapSheetsToExoplanetData(rows, options.enableMLValidation);
    } catch (error) {
      console.warn("Google Sheets fetch failed:", error);
      throw error;
    }
  }

  /**
   * Parse uploaded CSV data
   */
  async parseCSVData(
    csvContent: string,
    options: { enableMLValidation?: boolean } = {}
  ): Promise<ExoplanetData[]> {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) throw new Error("CSV must have headers and data");
      
      const headers = this.parseCSVLine(lines[0]);
      const data: ExoplanetData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length < 3) continue; // Skip incomplete rows
        
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h.toLowerCase().trim()] = values[idx] || '';
        });
        
        const exoplanet = this.mapRowToExoplanetData(row);
        if (exoplanet) {
          data.push(exoplanet);
        }
      }
      
      if (data.length === 0) throw new Error("No valid exoplanet data found in CSV");
      
      if (options.enableMLValidation) {
        return await Promise.all(data.map(d => this.validateWithML(d)));
      }
      
      return data;
    } catch (error) {
      console.warn("CSV parsing failed:", error);
      throw error;
    }
  }

  /**
   * Validate exoplanet data with ML model
   */
  private async validateWithML(exoplanet: ExoplanetData): Promise<ExoplanetData> {
    try {
      // Create synthetic light curve data from known parameters
      const syntheticData = this.generateSyntheticLightCurve(exoplanet);
      const prediction = await mlModelService.predict(syntheticData);
      
      return {
        ...exoplanet,
        mlPrediction: prediction,
        confidence: Math.max(exoplanet.confidence, prediction.confidence),
        equilibriumTempK: prediction.temperature,
        surfaceGravity: prediction.physicsValidation?.surfaceGravity || exoplanet.surfaceGravity,
        inHabitableZone: prediction.physicsValidation?.inHabitableZone ?? exoplanet.inHabitableZone
      };
    } catch (error) {
      console.warn("ML validation failed for", exoplanet.name, error);
      return exoplanet;
    }
  }

  /**
   * Generate synthetic light curve from known exoplanet parameters
   */
  private generateSyntheticLightCurve(exoplanet: ExoplanetData) {
    const observations = 2000;
    const period = exoplanet.orbitalPeriodDays;
    
    const time = Array.from({ length: observations }, (_, i) => 
      (i / observations) * Math.max(period * 10, 365)
    );
    
    // Simulated flux with transit-like features
    const flux = time.map(t => {
      const phase = (t % period) / period;
      // Transit occurs near phase 0.5
      const distFromTransit = Math.min(Math.abs(phase - 0.5), Math.abs(phase - 1.5));
      const transitDepth = 0.001; // ~100 ppm
      const transitWidth = 0.1;
      
      const base = 1.0;
      const transit = -transitDepth * Math.exp(-(Math.pow(distFromTransit / transitWidth, 2)));
      const noise = (Math.random() - 0.5) * 0.0003;
      
      return base + transit + noise;
    });
    
    const error = flux.map(() => 0.0005);
    
    return { time, flux, error, metadata: { source: 'synthetic' } };
  }

  /**
   * Build NASA query string
   */
  private buildNASAQuery(target: string): string {
    const columns = [
      'pl_name', 'pl_rade', 'pl_masse', 'pl_orb_period',
      'pl_orbsmax', 'st_teff', 'st_rad', 'st_mass'
    ].join(',');
    
    const cleanTarget = target.trim().toLowerCase();
    
    // Try various query strategies
    if (/^kic\s*\d+/.test(cleanTarget) || /^\d+$/.test(cleanTarget)) {
      const id = cleanTarget.replace(/[^0-9]/g, '');
      return `SELECT ${columns} FROM ps WHERE kepid=${id}`;
    }
    
    if (cleanTarget.includes('tic') || cleanTarget.includes('tess')) {
      const id = cleanTarget.replace(/[^0-9]/g, '');
      if (id) return `SELECT ${columns} FROM ps WHERE tic_id=${id}`;
    }
    
    // Default: search by name
    return `SELECT ${columns} FROM ps WHERE lower(pl_name) LIKE '%${cleanTarget.replace(/'/g, "''")}%'`;
  }

  /**
   * Map NASA response to ExoplanetData
   */
  private mapNASAToExoplanetData(records: any[], enableML?: boolean): ExoplanetData[] {
    return records.map((r, idx) => ({
      id: `nasa-${idx}`,
      name: r.pl_name || `Exoplanet ${idx + 1}`,
      orbitalPeriodDays: parseFloat(r.pl_orb_period) || 365,
      semiMajorAxisAU: parseFloat(r.pl_orbsmax) || 1,
      radiusEarth: parseFloat(r.pl_rade) || 1,
      massEarth: parseFloat(r.pl_masse),
      starTempK: parseFloat(r.st_teff) || 5778,
      starRadiusSolar: parseFloat(r.st_rad) || 1,
      starMassSolar: parseFloat(r.st_mass),
      equilibriumTempK: this.estimateEquilibriumTemp(
        parseFloat(r.st_teff) || 5778,
        parseFloat(r.st_rad) || 1,
        parseFloat(r.pl_orbsmax) || 1
      ),
      surfaceGravity: this.estimateSurfaceGravity(
        parseFloat(r.pl_rade) || 1,
        parseFloat(r.pl_masse) || 1
      ),
      inHabitableZone: this.isInHabitableZone(parseFloat(r.pl_orbsmax) || 1),
      dataSource: 'nasa',
      confidence: 0.85
    }));
  }

  /**
   * Map Google Sheets to ExoplanetData
   */
  private mapSheetsToExoplanetData(rows: any[][], enableML?: boolean): ExoplanetData[] {
    const headers = rows[0];
    return rows.slice(1).map((row, idx) => {
      const data: Record<string, string> = {};
      headers.forEach((h, i) => {
        data[h.toLowerCase().trim()] = row[i] || '';
      });
      
      const exoplanet = this.mapRowToExoplanetData(data);
      return exoplanet || {
        id: `sheet-${idx}`,
        name: `Planet ${idx + 1}`,
        orbitalPeriodDays: 365,
        semiMajorAxisAU: 1,
        radiusEarth: 1,
        starTempK: 5778,
        starRadiusSolar: 1,
        equilibriumTempK: 288,
        surfaceGravity: 9.8,
        inHabitableZone: false,
        dataSource: 'sheets',
        confidence: 0.5
      };
    });
  }

  /**
   * Map individual row to ExoplanetData
   */
  private mapRowToExoplanetData(row: Record<string, string>): ExoplanetData | null {
    const name = row['name'] || row['pl_name'] || row['planet'] || '';
    if (!name) return null;
    
    const orbitalPeriod = parseFloat(row['orbital period'] || row['period'] || row['pl_orb_period'] || '365');
    const semiMajorAxis = parseFloat(row['semi major axis'] || row['distance'] || row['pl_orbsmax'] || '1');
    const radiusEarth = parseFloat(row['radius'] || row['pl_rade'] || '1');
    const massEarth = parseFloat(row['mass'] || row['pl_masse'] || '0');
    const starTemp = parseFloat(row['star temp'] || row['st_teff'] || '5778');
    const starRadius = parseFloat(row['star radius'] || row['st_rad'] || '1');
    
    return {
      id: `user-${Date.now()}-${Math.random()}`,
      name,
      orbitalPeriodDays: isNaN(orbitalPeriod) ? 365 : orbitalPeriod,
      semiMajorAxisAU: isNaN(semiMajorAxis) ? 1 : semiMajorAxis,
      radiusEarth: isNaN(radiusEarth) ? 1 : radiusEarth,
      massEarth: massEarth || undefined,
      starTempK: isNaN(starTemp) ? 5778 : starTemp,
      starRadiusSolar: isNaN(starRadius) ? 1 : starRadius,
      equilibriumTempK: this.estimateEquilibriumTemp(starTemp, starRadius, semiMajorAxis),
      surfaceGravity: this.estimateSurfaceGravity(radiusEarth, massEarth || 1),
      inHabitableZone: this.isInHabitableZone(semiMajorAxis),
      dataSource: 'user-input',
      confidence: 0.7
    };
  }

  /**
   * Estimate equilibrium temperature
   */
  private estimateEquilibriumTemp(starTempK: number, starRadiusSolar: number, semiMajorAxisAU: number): number {
    const term = Math.sqrt(starRadiusSolar / (2 * semiMajorAxisAU));
    const albedo = 0.3;
    return starTempK * term * Math.pow(1 - albedo, 0.25);
  }

  /**
   * Estimate surface gravity
   */
  private estimateSurfaceGravity(radiusEarth: number, massEarth: number): number {
    return 9.8 * (massEarth / (radiusEarth * radiusEarth));
  }

  /**
   * Check if in habitable zone
   */
  private isInHabitableZone(semiMajorAxisAU: number): boolean {
    return semiMajorAxisAU > 0.95 && semiMajorAxisAU < 1.67;
  }

  /**
   * Parse CSV line accounting for quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}

export const enhancedExoplanetService = new EnhancedExoplanetService();
