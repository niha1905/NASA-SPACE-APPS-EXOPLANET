import pandas as pd
import numpy as np
import tensorflow as tf
import os
import pickle
import json
import matplotlib.pyplot as plt
import subprocess
import sys
import argparse
from typing import List, Dict, Any, Tuple
from math import pi, sqrt, acos, cos, sin, exp

# Physical constants (SI)
G = 6.67430e-11            # gravitational constant, m^3 kg^-1 s^-2
SIGMA = 5.670374419e-8     # Stefan-Boltzmann constant, W m^-2 K^-4
M_SUN = 1.98847e30         # kg
R_SUN = 6.957e8            # m
L_SUN = 3.828e26           # W
AU = 1.495978707e11        # m

# =====================
# Physics Helper Functions
# =====================

def period_days_to_semi_major_axis(period_days: float, m_star_solar: float = 1.0) -> Tuple[float, float]:
    """Estimate semi-major axis from orbital period using Kepler's 3rd law."""
    if period_days is None or period_days <= 0:
        return (float('nan'), float('nan'))
    P = period_days * 24.0 * 3600.0
    M = m_star_solar * M_SUN
    a_cubed = G * M * P * P / (4.0 * pi * pi)
    a = a_cubed ** (1.0 / 3.0)
    return a, a / AU

def luminosity_from_radius_temperature(r_star_solar: float, t_eff_k: float) -> Tuple[float, float]:
    """Compute stellar luminosity given radius in solar radii and effective temperature (K)."""
    if r_star_solar is None or t_eff_k is None:
        return (float('nan'), float('nan'))
    R = r_star_solar * R_SUN
    L = 4.0 * pi * R * R * SIGMA * (t_eff_k ** 4)
    return L, L / L_SUN

def equilibrium_temperature(t_star_k: float, r_star_m: float, a_m: float, albedo: float = 0.3) -> float:
    """Compute planet equilibrium temperature (Kelvin)."""
    if any(v is None for v in (t_star_k, r_star_m, a_m)) or a_m <= 0:
        return float('nan')
    try:
        term = sqrt(r_star_m / (2.0 * a_m))
        return t_star_k * term * ((1.0 - albedo) ** 0.25)
    except Exception:
        return float('nan')

def habitable_zone_bounds(luminosity_over_sun: float) -> Tuple[float, float]:
    """Return conservative HZ inner and outer bounds in AU scaled by stellar luminosity."""
    if luminosity_over_sun is None or luminosity_over_sun <= 0:
        return (float('nan'), float('nan'))
    scale = sqrt(luminosity_over_sun)
    inner = 0.95 * scale
    outer = 1.67 * scale
    return inner, outer

def compute_gzi(a_au: float, luminosity_over_sun: float) -> float:
    """Compute Goldilocks Zone Index (GZI) in [0,1]."""
    if any(v is None for v in (a_au, luminosity_over_sun)):
        return float('nan')
    inner, outer = habitable_zone_bounds(luminosity_over_sun)
    if inner <= a_au <= outer:
        return 1.0
    if a_au < inner:
        frac = (inner - a_au) / inner
        return max(0.0, 1.0 - frac)
    else:
        frac = (a_au - outer) / outer
        return max(0.0, 1.0 - frac)

def compute_hi(gzi: float, teq_k: float) -> float:
    """Compute a simple Habitability Index (HI) combining GZI and temperature suitability."""
    if gzi is None or teq_k is None:
        return float('nan')
    t_score = max(0.0, 1.0 - abs(teq_k - 288.0) / 200.0)
    hi = 0.6 * gzi + 0.4 * t_score
    if hi < 0.0:
        return 0.0
    if hi > 1.0:
        return 1.0
    return hi

def validate_candidate(rec: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Apply physics-consistency checks to a candidate record."""
    issues: List[str] = []

    # Basic numeric sanity
    period = rec.get('koi_period') or rec.get('pl_orbper')
    if period is not None and period <= 0:
        issues.append('non-positive period')

    # eccentricity
    e = rec.get('eccentricity')
    if e is not None:
        try:
            if not (0.0 <= float(e) < 1.0):
                issues.append('eccentricity outside [0,1)')
        except Exception:
            issues.append('eccentricity not numeric')

    # distances vs stellar radius
    a_au = rec.get('Distance_AU') or rec.get('a_au')
    srad = rec.get('koi_srad') or rec.get('st_rad')
    if a_au is not None and srad is not None:
        try:
            a_au_f = float(a_au)
            srad_au = float(srad) * (R_SUN / AU)
            if a_au_f <= 1.5 * srad_au:
                issues.append('orbital distance too close to stellar radius')
        except Exception:
            issues.append('could not compare a_au and srad')

    # equilibrium temperature sanity
    teq = rec.get('koi_teq') or rec.get('pl_eqt')
    if teq is not None:
        try:
            if teq <= 0 or teq > 10000:
                issues.append('unphysical equilibrium temperature')
        except Exception:
            issues.append('teq not numeric')

    is_valid = len(issues) == 0
    return is_valid, issues

def derive_missing_attributes(rec: Dict[str, Any], assume_mstar_solar: float = 1.0) -> Dict[str, Any]:
    """Try to derive commonly missing attributes."""
    out = dict(rec)
    
    # Distance from period
    if out.get('Distance_AU') is None:
        period = out.get('koi_period') or out.get('pl_orbper')
        try:
            if period is not None and period > 0:
                _, a_au = period_days_to_semi_major_axis(float(period), assume_mstar_solar)
                out['Distance_AU'] = a_au
        except Exception:
            pass

    # Stellar luminosity
    if out.get('stellar_lum_ratio') is None:
        r = out.get('koi_srad') or out.get('st_rad')
        t = out.get('koi_steff') or out.get('st_teff')
        try:
            if r is not None and t is not None:
                L_w, L_rel = luminosity_from_radius_temperature(float(r), float(t))
                out['stellar_lum_w'] = L_w
                out['stellar_lum_ratio'] = L_rel
        except Exception:
            pass

    # Insolation (relative to Earth)
    if out.get('koi_insol') is None:
        L_rel = out.get('stellar_lum_ratio')
        a_au = out.get('Distance_AU')
        try:
            if L_rel is not None and a_au is not None and a_au > 0:
                out['koi_insol'] = float(L_rel) / (float(a_au) ** 2)
        except Exception:
            pass

    # Equilibrium temperature
    if out.get('koi_teq') is None:
        t = out.get('koi_steff') or out.get('st_teff')
        r = out.get('koi_srad') or out.get('st_rad')
        a_au = out.get('Distance_AU')
        try:
            if t is not None and r is not None and a_au is not None:
                r_m = float(r) * R_SUN
                a_m = float(a_au) * AU
                out['koi_teq'] = equilibrium_temperature(float(t), r_m, a_m)
        except Exception:
            pass

    # Compute GZI and HI
    try:
        a_au = out.get('Distance_AU')
        L_rel = out.get('stellar_lum_ratio')
        teq = out.get('koi_teq')
        if a_au is not None and L_rel is not None:
            out['GZI'] = compute_gzi(float(a_au), float(L_rel))
        if out.get('GZI') is not None and teq is not None:
            out['HI'] = compute_hi(float(out['GZI']), float(teq))
    except Exception:
        pass

    return out

# =====================
# Enhanced Configuration
# =====================

RANDOM_SEED = 42
KEPLER_FILE = "cumulative_2025.11.16_08.09.22.csv"
K2_FILE = "k2pandc_2025.11.16_08.09.33.csv"
TESS_FILE = "TOI_2025.11.16_08.09.27.csv"
WEIGHTS_FILE = "combined_weights.weights.h5"
ARTIFACTS_DIR = "physics_enhanced_results"
AUGMENT_LC = True
LC_LEN = 500
TARGET_CLASS = "koi_disposition"

# Enhanced feature sets
TABULAR_FEATURES = [
    'koi_teq', 'koi_insol', 'koi_steff', 'koi_srad',
    'koi_slogg', 'ra', 'dec', 'koi_kepmag'
]

LC_SIMULATION_FEATURES = ['koi_period', 'koi_duration', 'koi_depth', 'koi_prad']

# Physics-based features
PHYSICS_FEATURES = [
    'semi_major_axis_au', 'stellar_luminosity', 'flux_at_planet',
    'equilibrium_temperature_physics', 'goldilocks_zone_index',
    'habitability_index', 'transit_probability', 'tidal_lock_probability',
    'transit_duration_theoretical', 'transit_depth_consistency'
]

# Column mappings (from original code)
COLUMN_MAPPINGS = {
    'kepler': {
        'id_name': 'kepoi_name', 'disp': 'koi_disposition', 'period': 'koi_period',
        'duration': 'koi_duration', 'depth': 'koi_depth', 'prad': 'koi_prad',
        'teq': 'koi_teq', 'insol': 'koi_insol', 'steff': 'koi_steff',
        'srad': 'koi_srad', 'slogg': 'koi_slogg', 'mag': 'koi_kepmag',
        'ra': 'ra', 'dec': 'dec'
    },
    'k2': {
        'id_name': 'pl_name', 'disp': 'disposition', 'period': 'pl_orbper',
        'duration': 'pl_trandurh', 'depth': 'pl_trandep', 'prad': 'pl_rade',
        'teq': 'pl_eqt', 'insol': 'pl_insol', 'steff': 'st_teff',
        'srad': 'st_rad', 'slogg': 'st_logg', 'mag': None,
        'ra': 'ra', 'dec': 'dec'
    },
    'tess': {
        'id_name': 'toi', 'disp': 'tfopwg_disp', 'period': 'pl_orbper',
        'duration': 'pl_trandurh', 'depth': 'pl_trandep', 'prad': 'pl_rade',
        'teq': 'pl_eqt', 'insol': 'pl_insol', 'steff': 'st_teff',
        'srad': 'st_rad', 'slogg': 'st_logg', 'mag': 'st_tmag',
        'ra': 'ra', 'dec': 'dec'
    }
}

# =====================
# Simplified Enhanced Model Architecture
# =====================

def build_physics_enhanced_model(
    tabular_dim: int, 
    physics_dim: int, 
    n_classes: int, 
    reg_outputs: int, 
    lc_len: int
) -> tf.keras.Model:
    """Build the physics-enhanced hybrid model with simplified architecture."""
    
    # 1. Tabular Input Branch
    tab_input = tf.keras.Input(shape=(tabular_dim,), name='tabular_input')
    tab_branch = tf.keras.layers.Dense(128, activation='relu')(tab_input)
    tab_branch = tf.keras.layers.BatchNormalization()(tab_branch)
    tab_branch = tf.keras.layers.Dropout(0.3)(tab_branch)
    tab_branch = tf.keras.layers.Dense(64, activation='relu')(tab_branch)
    tab_branch = tf.keras.layers.BatchNormalization()(tab_branch)
    
    # 2. Physics Features Branch (Simplified - no custom attention)
    physics_input = tf.keras.Input(shape=(physics_dim,), name='physics_input')
    physics_branch = tf.keras.layers.Dense(64, activation='relu')(physics_input)
    physics_branch = tf.keras.layers.BatchNormalization()(physics_branch)
    physics_branch = tf.keras.layers.Dropout(0.2)(physics_branch)
    physics_branch = tf.keras.layers.Dense(32, activation='relu')(physics_branch)
    
    # 3. Light Curve Branch (Multi-Scale CNN)
    lc_input = tf.keras.Input(shape=(lc_len, 1), name='lc_input')
    
    # Multi-scale feature extraction
    conv1 = tf.keras.layers.Conv1D(32, 5, activation='relu', padding='same')(lc_input)
    conv1 = tf.keras.layers.BatchNormalization()(conv1)
    pool1 = tf.keras.layers.MaxPooling1D(2)(conv1)
    
    conv2 = tf.keras.layers.Conv1D(64, 10, activation='relu', padding='same')(pool1)
    conv2 = tf.keras.layers.BatchNormalization()(conv2)
    pool2 = tf.keras.layers.MaxPooling1D(2)(conv2)
    
    conv3 = tf.keras.layers.Conv1D(128, 20, activation='relu', padding='same')(pool2)
    conv3 = tf.keras.layers.BatchNormalization()(conv3)
    pool3 = tf.keras.layers.GlobalAveragePooling1D()(conv3)
    
    # Additional processing for light curves
    lc_branch = tf.keras.layers.Dense(64, activation='relu')(pool3)
    lc_branch = tf.keras.layers.BatchNormalization()(lc_branch)
    lc_branch = tf.keras.layers.Dropout(0.3)(lc_branch)
    
    # 4. Fusion Layer
    fusion = tf.keras.layers.Concatenate()([tab_branch, physics_branch, lc_branch])
    
    # Deep fusion network
    fusion = tf.keras.layers.Dense(256, activation='relu')(fusion)
    fusion = tf.keras.layers.BatchNormalization()(fusion)
    fusion = tf.keras.layers.Dropout(0.4)(fusion)
    
    fusion = tf.keras.layers.Dense(128, activation='relu')(fusion)
    fusion = tf.keras.layers.BatchNormalization()(fusion)
    fusion = tf.keras.layers.Dropout(0.3)(fusion)
    
    fusion = tf.keras.layers.Dense(64, activation='relu')(fusion)
    fusion = tf.keras.layers.BatchNormalization()(fusion)
    
    # 5. Multi-Output Heads
    class_head = tf.keras.layers.Dense(32, activation='relu')(fusion)
    class_head = tf.keras.layers.Dropout(0.2)(class_head)
    class_output = tf.keras.layers.Dense(n_classes, activation='softmax', name='class_output')(class_head)
    
    reg_head = tf.keras.layers.Dense(64, activation='relu')(fusion)
    reg_head = tf.keras.layers.Concatenate()([reg_head, physics_branch])  # Include physics directly
    reg_head = tf.keras.layers.Dense(32, activation='relu')(reg_head)
    reg_head = tf.keras.layers.Dropout(0.2)(reg_head)
    reg_output = tf.keras.layers.Dense(reg_outputs, activation='linear', name='reg_output')(reg_head)
    
    model = tf.keras.Model(
        inputs=[tab_input, physics_input, lc_input],
        outputs=[class_output, reg_output]
    )
    
    return model

# =====================
# Physics-Enhanced Feature Engineering
# =====================

class PhysicsEnhancedFeatureEngine:
    """Enhanced physics feature computation with validation."""
    
    def __init__(self):
        self.required_columns = ['koi_period', 'koi_steff', 'koi_srad', 'koi_prad']
    
    def compute_physics_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute comprehensive physics-based features."""
        physics_data = []
        
        for idx, row in df.iterrows():
            features = self._compute_row_physics(row)
            physics_data.append(features)
        
        physics_df = pd.DataFrame(physics_data, columns=PHYSICS_FEATURES)
        return pd.concat([df, physics_df], axis=1)
    
    def _compute_row_physics(self, row: pd.Series) -> List[float]:
        """Compute physics features for a single row."""
        try:
            # 1. Orbital parameters
            period = row.get('koi_period')
            m_star = row.get('koi_smass', 1.0)
            a_m, a_au = period_days_to_semi_major_axis(period, m_star)
            
            # 2. Stellar properties
            r_star = row.get('koi_srad', 1.0)
            t_eff = row.get('koi_steff', 5778)
            lum_w, lum_ratio = luminosity_from_radius_temperature(r_star, t_eff)
            
            # 3. Planet flux and temperature
            flux = lum_w / (4 * np.pi * (a_m ** 2)) if a_m > 0 else np.nan
            teq_physics = equilibrium_temperature(t_eff, r_star * R_SUN, a_m)
            
            # 4. Habitability indices
            gzi = compute_gzi(a_au, lum_ratio) if not np.isnan(a_au) else 0.0
            hi = compute_hi(gzi, teq_physics) if not np.isnan(teq_physics) else 0.0
            
            # 5. Transit probability
            transit_prob = (r_star * R_SUN) / a_m if a_m > 0 else 0.1
            
            # 6. Tidal locking probability
            tidal_lock_prob = self._compute_tidal_lock_probability(a_au, period, m_star)
            
            # 7. Theoretical transit duration
            transit_dur_theoretical = self._compute_transit_duration(period, r_star, a_au)
            
            # 8. Transit depth consistency
            depth_consistency = self._check_transit_depth_consistency(row, r_star)
            
            return [
                a_au, lum_ratio, flux, teq_physics, gzi, hi, 
                transit_prob, tidal_lock_prob, transit_dur_theoretical, depth_consistency
            ]
            
        except Exception:
            return [np.nan] * len(PHYSICS_FEATURES)
    
    def _compute_tidal_lock_probability(self, a_au: float, period: float, m_star: float) -> float:
        """Compute probability of tidal locking."""
        if np.isnan(a_au) or np.isnan(period):
            return 0.1
        
        a_critical = 0.1 * (m_star ** (2/3))
        
        if a_au < a_critical:
            return 0.9
        elif a_au < 2 * a_critical:
            return 0.5
        else:
            return 0.1
    
    def _compute_transit_duration(self, period: float, r_star: float, a_au: float) -> float:
        """Compute theoretical transit duration in hours."""
        if np.isnan(period) or np.isnan(r_star) or np.isnan(a_au):
            return np.nan
        
        try:
            duration_hours = (period * 24 * r_star * R_SUN) / (np.pi * a_au * AU)
            return max(0.1, min(24.0, duration_hours))
        except:
            return np.nan
    
    def _check_transit_depth_consistency(self, row: pd.Series, r_star: float) -> float:
        """Check consistency between reported depth and theoretical depth."""
        observed_depth = row.get('koi_depth', np.nan)
        planet_radius = row.get('koi_prad', np.nan)
        
        if np.isnan(observed_depth) or np.isnan(planet_radius) or np.isnan(r_star):
            return 1.0
        
        theoretical_depth = (planet_radius / r_star) ** 2 * 1e6
        ratio = min(observed_depth, theoretical_depth) / max(observed_depth, theoretical_depth)
        return float(ratio)

# =====================
# Physics-Consistent Light Curve Simulation
# =====================

def simulate_physics_light_curve(row, lc_len, target_col):
    """Generate physics-consistent light curve."""
    np.random.seed(int(row.name * RANDOM_SEED) % (2**32 - 1))

    disposition = row[target_col]
    period = row.get('koi_period', 10)
    duration = row.get('koi_duration', 5)
    depth = row.get('koi_depth', 1000)
    planet_radius = row.get('koi_prad', 1.0)
    star_radius = row.get('koi_srad', 1.0)
    
    # Physics-consistent depth calculation
    if not np.isnan(depth) and not np.isnan(planet_radius) and not np.isnan(star_radius):
        theoretical_depth = (planet_radius / star_radius) ** 2
        reported_depth_norm = depth / 1e6
        dip_depth_normalized = 0.7 * reported_depth_norm + 0.3 * theoretical_depth
    else:
        dip_depth_normalized = 0.0
    
    # Disposition-based parameters
    if disposition == 'CANDIDATE':
        noise_level = 0.015
        dip_variation = np.random.uniform(0.3, 0.7)
    elif disposition == 'CONFIRMED':
        noise_level = 0.008
        dip_variation = 1.0
    else:  # FALSE POSITIVE
        noise_level = 0.01
        dip_variation = 0.0

    # Generate baseline light curve
    time = np.linspace(0, 4 * np.pi, lc_len)
    stellar_variation = 0.002 * np.sin(time)
    noise = np.random.normal(0, noise_level, lc_len)
    lc = 1.0 + stellar_variation + noise

    if dip_depth_normalized > 0 and dip_variation > 0:
        transit_duration_hours = duration
        transit_duration_steps = int((transit_duration_hours / 24.0) * (lc_len / 10.0))
        transit_duration_steps = max(3, min(transit_duration_steps, lc_len // 8))
        
        center = lc_len // 2
        
        # Add limb darkening effect
        for i in range(center - transit_duration_steps//2, center + transit_duration_steps//2):
            if 0 <= i < len(lc):
                x = abs(i - center) / (transit_duration_steps / 2)
                if x <= 1.0:
                    limb_darkening = 1 - 0.4 * (1 - np.sqrt(1 - x**2)) - 0.3 * (1 - np.sqrt(1 - x**2))**2
                    lc[i] -= dip_depth_normalized * dip_variation * limb_darkening

    return (lc - np.mean(lc)) / (np.std(lc) + 1e-6)

# =====================
# Data Loading and Processing (Original Functions)
# =====================

def standardize_disposition(disp):
    """Maps various mission dispositions to the three standardized classes."""
    if pd.isna(disp):
        return None
    disp_lower = str(disp).lower()
    if 'confirm' in disp_lower or 'cp' in disp_lower:
        return 'CONFIRMED'
    elif 'candida' in disp_lower or 'pc' in disp_lower:
        return 'CANDIDATE'
    elif 'false' in disp_lower or 'fp' in disp_lower or 'non' in disp_lower:
        return 'FALSE POSITIVE'
    return None

def load_and_standardize_data(file_path, mission_type):
    """Loads a single mission file, renames columns, and standardizes dispositions."""
    try:
        df = pd.read_csv(file_path, comment='#')
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Skipping {mission_type} data.")
        return pd.DataFrame()

    mission_map = COLUMN_MAPPINGS[mission_type]

    target_names = {
        'id_name': 'id_name', 'disp': 'koi_disposition', 'period': 'koi_period',
        'duration': 'koi_duration', 'depth': 'koi_depth', 'prad': 'koi_prad',
        'teq': 'koi_teq', 'insol': 'koi_insol', 'steff': 'koi_steff',
        'srad': 'koi_srad', 'slogg': 'koi_slogg', 'mag': 'koi_kepmag',
        'ra': 'ra', 'dec': 'dec'
    }

    final_rename_map = {}
    for key, source_col in mission_map.items():
        if source_col is not None and source_col in df.columns and key in target_names:
            final_rename_map[source_col] = target_names[key]

    df = df.rename(columns=final_rename_map)

    if 'koi_disposition' in df.columns:
        df['koi_disposition'] = df['koi_disposition'].apply(standardize_disposition)

    df['mission'] = mission_type
    cols_to_keep = list(target_names.values()) + ['mission']
    return df[[col for col in cols_to_keep if col in df.columns]]

# =====================
# Enhanced Training Pipeline
# =====================

def train_physics_enhanced_model():
    """Main training pipeline for physics-enhanced model."""
    print("\n" + "="*60)
    print("PHYSICS-ENHANCED EXOPLANET CLASSIFICATION PIPELINE")
    print("="*60)
    
    # Initialize components
    feature_engine = PhysicsEnhancedFeatureEngine()
    
    # Load data
    df_kepler = load_and_standardize_data(KEPLER_FILE, 'kepler')
    df_k2 = load_and_standardize_data(K2_FILE, 'k2') 
    df_tess = load_and_standardize_data(TESS_FILE, 'tess')
    
    df_combined = pd.concat([df_kepler, df_k2, df_tess], ignore_index=True)
    
    # Enhanced data preparation
    print("Computing physics-enhanced features...")
    
    # Apply physics consistency filter
    valid_indices = []
    physics_flags = []
    
    for idx, row in df_combined.iterrows():
        is_valid, issues = validate_candidate(row.to_dict())
        valid_indices.append(is_valid)
        physics_flags.append(len(issues))
    
    df_enhanced = df_combined.copy()
    df_enhanced['physics_consistency_flag'] = physics_flags
    
    print(f"Physics consistency: {sum(valid_indices)}/{len(df_enhanced)} fully consistent")
    
    # Compute physics features
    df_enhanced = feature_engine.compute_physics_features(df_enhanced)
    
    # Enhanced regression targets
    df_enhanced["Distance_AU"] = df_enhanced["koi_period"].apply(
        lambda p: period_days_to_semi_major_axis(p, 1.0)[1] if not np.isnan(p) else np.nan
    )
    
    def compute_enhanced_water_prob(row):
        radius = row.get('koi_prad')
        temp = row.get('koi_teq')
        gzi = row.get('goldilocks_zone_index', 0)
        if np.isnan(radius) or np.isnan(temp):
            return 0.0
        size_factor = max(0, 1 - abs(radius - 1.0) / 2.0)
        temp_factor = max(0, 1 - abs(temp - 288) / 100.0)
        gzi_factor = gzi
        return 0.4 * size_factor + 0.4 * temp_factor + 0.2 * gzi_factor
    
    def compute_enhanced_atmosphere_prob(row):
        radius = row.get('koi_prad')
        temp = row.get('equilibrium_temperature_physics')
        if np.isnan(radius) or np.isnan(temp):
            return 0.0
        size_prob = min(1.0, radius / 2.0)
        temp_prob = max(0, 1 - max(0, temp - 400) / 1000.0)
        return size_prob * temp_prob
    
    def compute_comprehensive_habitability(row):
        hi = row.get('habitability_index', 0)
        water_prob = row.get('Enhanced_Water_Prob', 0)
        atm_prob = row.get('Enhanced_Atmosphere_Prob', 0)
        gzi = row.get('goldilocks_zone_index', 0)
        return 0.3 * hi + 0.3 * water_prob + 0.2 * atm_prob + 0.2 * gzi
    
    df_enhanced["Enhanced_Water_Prob"] = df_enhanced.apply(compute_enhanced_water_prob, axis=1)
    df_enhanced["Enhanced_Atmosphere_Prob"] = df_enhanced.apply(compute_enhanced_atmosphere_prob, axis=1)
    df_enhanced["Comprehensive_Habitability"] = df_enhanced.apply(compute_comprehensive_habitability, axis=1)
    
    regression_targets = [
        "koi_prad", "Distance_AU", "Enhanced_Water_Prob", 
        "Enhanced_Atmosphere_Prob", "Comprehensive_Habitability",
        "equilibrium_temperature_physics", "goldilocks_zone_index", "habitability_index"
    ]
    
    # Fill missing values
    all_features = TABULAR_FEATURES + LC_SIMULATION_FEATURES + PHYSICS_FEATURES
    for col in all_features + regression_targets:
        if col in df_enhanced.columns:
            df_enhanced[col] = df_enhanced[col].fillna(df_enhanced[col].mean())
    
    # Drop rows missing target class
    df_enhanced = df_enhanced.dropna(subset=[TARGET_CLASS]).reset_index(drop=True)
    print(f"Final training samples: {len(df_enhanced)}")
    
    # Encode labels
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.utils.class_weight import compute_class_weight
    
    label_enc = LabelEncoder()
    y_class = label_enc.fit_transform(df_enhanced[TARGET_CLASS])
    n_classes = len(np.unique(y_class))
    
    # Prepare inputs
    X_tab = df_enhanced[TABULAR_FEATURES].values
    X_physics = df_enhanced[PHYSICS_FEATURES].values
    y_reg = df_enhanced[regression_targets].values
    
    # Scale features
    tab_scaler = StandardScaler()
    X_tab_scaled = tab_scaler.fit_transform(X_tab)
    
    physics_scaler = StandardScaler()
    X_physics_scaled = physics_scaler.fit_transform(X_physics)
    
    # Generate light curves
    print("Generating physics-consistent light curves...")
    X_lc_list = df_enhanced.apply(
        lambda row: simulate_physics_light_curve(row, LC_LEN, TARGET_CLASS), axis=1
    ).tolist()
    X_lc = np.array(X_lc_list)
    X_lc_scaled = np.expand_dims(X_lc, axis=2)
    
    # Apply log transform to skewed targets
    y_reg_cont = y_reg.copy()
    if y_reg_cont.shape[0] > 0:
        y_reg_cont[:, 0] = np.where(y_reg_cont[:, 0] >= 0, np.log1p(y_reg_cont[:, 0]), y_reg_cont[:, 0])
        y_reg_cont[:, 1] = np.where(y_reg_cont[:, 1] >= 0, np.log1p(y_reg_cont[:, 1]), y_reg_cont[:, 1])
    
    # Split data
    X_tab_train, X_tab_test, X_physics_train, X_physics_test, X_lc_train, X_lc_test, \
    y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X_tab_scaled, X_physics_scaled, X_lc_scaled, y_class, y_reg_cont, 
        test_size=0.2, random_state=RANDOM_SEED, stratify=y_class
    )
    
    # Scale regression targets
    reg_scaler = StandardScaler()
    reg_scaler.fit(y_reg_train)
    y_reg_train_scaled = reg_scaler.transform(y_reg_train)
    y_reg_test_scaled = reg_scaler.transform(y_reg_test)
    
    # Build and compile enhanced model
    print("Building physics-enhanced model...")
    model = build_physics_enhanced_model(
        len(TABULAR_FEATURES), len(PHYSICS_FEATURES), n_classes, len(regression_targets), LC_LEN
    )
    
    # Enhanced optimizer
    optimizer = tf.keras.optimizers.Adam(learning_rate=1e-4)
    
    model.compile(
        optimizer=optimizer,
        loss={
            "class_output": "sparse_categorical_crossentropy",
            "reg_output": "mse"
        },
        loss_weights={"class_output": 0.7, "reg_output": 0.3},
        metrics={
            "class_output": ["accuracy"],
            "reg_output": ["mse", "mae"]
        }
    )
    
# Enhanced callbacks
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

callbacks = [
    # Early stopping based on accuracy (primary goal)
    tf.keras.callbacks.EarlyStopping(
        monitor='val_class_output_accuracy',
        patience=15,  # Slightly more patience
        restore_best_weights=True,
        min_delta=0.002,
        mode='max'
    ),
    # Learning rate reduction based on loss (more sensitive to small improvements)
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_class_output_loss',
        factor=0.5,
        patience=5,
        min_lr=1e-6,
        mode='min'
    ),
    # Model checkpoint based on accuracy (save the most accurate model)
    tf.keras.callbacks.ModelCheckpoint(
        os.path.join(ARTIFACTS_DIR, 'best_physics_enhanced_model.weights.h5'),
        monitor='val_class_output_accuracy',
        mode='max',
        save_best_only=True,
        save_weights_only=True
    )
]

print("Training physics-enhanced model...")
    history = model.fit(
        [X_tab_train, X_physics_train, X_lc_train],
        [y_class_train, y_reg_train_scaled],
        validation_data=(
            [X_tab_test, X_physics_test, X_lc_test],
            [y_class_test, y_reg_test_scaled]
        ),
        epochs=100,
        batch_size=32,
        callbacks=callbacks,
        verbose=1
    )
    
    # Save artifacts
    model.save_weights(os.path.join(ARTIFACTS_DIR, WEIGHTS_FILE))
    
    artifacts = {
        'tab_scaler': tab_scaler,
        'physics_scaler': physics_scaler,
        'reg_scaler': reg_scaler,
        'label_encoder': label_enc,
        'regression_targets': regression_targets
    }
    
    for name, artifact in artifacts.items():
        with open(os.path.join(ARTIFACTS_DIR, f'{name}.pkl'), 'wb') as f:
            pickle.dump(artifact, f)
    
    # Save training history
    hist_df = pd.DataFrame(history.history)
    hist_df.to_csv(os.path.join(ARTIFACTS_DIR, "training_history.csv"), index=False)
    
    print(f"\nTraining completed. Artifacts saved to {ARTIFACTS_DIR}")
    
    return model, artifacts

# =====================
# Main Execution
# =====================

def main():
    parser = argparse.ArgumentParser(description='Run physics-enhanced exoplanet classification')
    parser.add_argument('--mode', choices=['physics', 'standard', 'both'], default='physics', 
                       help='Which pipeline to run')
    
    args = parser.parse_args()
    
    if args.mode in ['physics', 'both']:
        print("Running physics-enhanced pipeline...")
        model, artifacts = train_physics_enhanced_model()
        
    if args.mode in ['standard', 'both']:
        # Run standard pipeline as fallback
        try:
            from trial import train_combined_model_fixed, run_tess_inference
            print("Running standard pipeline...")
            tab_scaler, label_enc, regression_targets, model, reg_scaler = train_combined_model_fixed()
            run_tess_inference(tab_scaler, label_enc, regression_targets, model, reg_scaler=reg_scaler)
        except ImportError:
            print("Standard pipeline not available - running physics-enhanced only")

if __name__ == "__main__":
    main()