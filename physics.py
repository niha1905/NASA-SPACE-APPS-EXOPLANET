"""Physics helpers for exoplanet feature derivation and validation.

Provides functions to compute orbital parameters, stellar luminosity and flux,
equilibrium temperature, Goldilocks Zone Index (GZI), Habitability Index (HI),
and a simple physics-consistency filter and imputation helpers.

These utilities are intentionally conservative and unit-aware (SI & AU).
"""
from math import pi, sqrt, acos, cos, sin, exp
from typing import Tuple, Dict, Any, List

# Physical constants (SI)
G = 6.67430e-11            # gravitational constant, m^3 kg^-1 s^-2
SIGMA = 5.670374419e-8     # Stefan-Boltzmann constant, W m^-2 K^-4
M_SUN = 1.98847e30         # kg
R_SUN = 6.957e8            # m
L_SUN = 3.828e26           # W
AU = 1.495978707e11        # m


def period_days_to_semi_major_axis(period_days: float, m_star_solar: float = 1.0) -> Tuple[float, float]:
    """Estimate semi-major axis from orbital period using Kepler's 3rd law.

    Returns (a_meters, a_au).
    If `m_star_solar` is missing, default to 1.0 (solar mass).
    """
    if period_days is None or period_days <= 0:
        return (float('nan'), float('nan'))
    P = period_days * 24.0 * 3600.0
    M = m_star_solar * M_SUN
    a_cubed = G * M * P * P / (4.0 * pi * pi)
    a = a_cubed ** (1.0 / 3.0)
    return a, a / AU


def semi_major_axis_to_period_days(a_m: float, m_star_solar: float = 1.0) -> float:
    """Compute orbital period (days) from semi-major axis (meters).
    """
    if a_m is None or a_m <= 0:
        return float('nan')
    M = m_star_solar * M_SUN
    P = 2.0 * pi * sqrt(a_m ** 3 / (G * M))
    return P / (24.0 * 3600.0)


def eccentricity_from_periastron_apastron(r_peri_m: float, r_apa_m: float) -> float:
    """Compute eccentricity from periastron and apastron distances.
    e = (ra - rp) / (ra + rp)
    """
    if r_peri_m is None or r_apa_m is None:
        return float('nan')
    if (r_apa_m + r_peri_m) == 0:
        return float('nan')
    return (r_apa_m - r_peri_m) / (r_apa_m + r_peri_m)


def inclination_from_impact_parameter(impact_parameter: float, r_star_m: float, a_m: float) -> float:
    """Estimate orbital inclination (degrees) from impact parameter b, stellar radius and semi-major axis.

    cos(i) = b * R_star / a  -> i = arccos(b*R_star/a)
    """
    try:
        if any(v is None for v in (impact_parameter, r_star_m, a_m)):
            return float('nan')
        x = (impact_parameter * r_star_m) / a_m
        # numeric safety
        if x <= -1 or x >= 1:
            return float('nan')
        return acos(x) * 180.0 / pi
    except Exception:
        return float('nan')


def luminosity_from_radius_temperature(r_star_solar: float, t_eff_k: float) -> Tuple[float, float]:
    """Compute stellar luminosity given radius in solar radii and effective temperature (K).

    Returns (L_watts, L_over_Lsun).
    """
    if r_star_solar is None or t_eff_k is None:
        return (float('nan'), float('nan'))
    R = r_star_solar * R_SUN
    L = 4.0 * pi * R * R * SIGMA * (t_eff_k ** 4)
    return L, L / L_SUN


def flux_at_separation(lum_watts: float, a_m: float) -> float:
    """Flux (W/m^2) at orbital distance a_m from an object of luminosity lum_watts."""
    if lum_watts is None or a_m is None or a_m <= 0:
        return float('nan')
    return lum_watts / (4.0 * pi * a_m * a_m)


def equilibrium_temperature(t_star_k: float, r_star_m: float, a_m: float, albedo: float = 0.3) -> float:
    """Compute planet equilibrium temperature (Kelvin).

    Simplified assumption: full redistribution and no greenhouse.
    Teq = T_star * sqrt(R_star/(2*a)) * (1 - A)^{1/4}
    """
    if any(v is None for v in (t_star_k, r_star_m, a_m)) or a_m <= 0:
        return float('nan')
    try:
        term = sqrt(r_star_m / (2.0 * a_m))
        return t_star_k * term * ((1.0 - albedo) ** 0.25)
    except Exception:
        return float('nan')


def habitable_zone_bounds(luminosity_over_sun: float) -> Tuple[float, float]:
    """Return conservative HZ inner and outer bounds in AU scaled by stellar luminosity.

    Uses simple scaling with sqrt(L/L_sun) and conservative coefficients.
    Coefficients chosen as approximate conservative HZ: inner~0.95, outer~1.67 AU (for Sun).
    """
    if luminosity_over_sun is None or luminosity_over_sun <= 0:
        return (float('nan'), float('nan'))
    scale = sqrt(luminosity_over_sun)
    inner = 0.95 * scale
    outer = 1.67 * scale
    return inner, outer


def compute_gzi(a_au: float, luminosity_over_sun: float) -> float:
    """Compute Goldilocks Zone Index (GZI) in [0,1].

    - GZI == 1 if inside conservative HZ.
    - Outside, linearly decreases with relative distance from the nearest boundary and clamps at 0.
    """
    if any(v is None for v in (a_au, luminosity_over_sun)):
        return float('nan')
    inner, outer = habitable_zone_bounds(luminosity_over_sun)
    if inner <= a_au <= outer:
        return 1.0
    if a_au < inner:
        # how far inside (fraction of inner)
        frac = (inner - a_au) / inner
        return max(0.0, 1.0 - frac)
    else:
        frac = (a_au - outer) / outer
        return max(0.0, 1.0 - frac)


def compute_hi(gzi: float, teq_k: float) -> float:
    """Compute a simple Habitability Index (HI) combining GZI and temperature suitability.

    - Temperature preference peaks near 288 K (15°C). A smooth linear penalty is used.
    - HI weighted: 0.6*GZI + 0.4*T_score, clamped to [0,1].
    """
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
    """Apply a set of physics-consistency checks to a candidate record.

    Returns (is_valid, list_of_issues). Missing fields are tolerated but noted.
    """
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
        # require semi-major axis > (1.5 * stellar radius in AU)
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

    # inclination range
    inc = rec.get('inclination')
    if inc is not None:
        try:
            incf = float(inc)
            if incf < 0 or incf > 180:
                issues.append('inclination outside [0,180]')
        except Exception:
            issues.append('inclination not numeric')

    is_valid = len(issues) == 0
    return is_valid, issues


def derive_missing_attributes(rec: Dict[str, Any], assume_mstar_solar: float = 1.0) -> Dict[str, Any]:
    """Try to derive commonly missing attributes in-place and return the augmented dict.

    Derivations performed (when inputs present):
    - Distance_AU from koi_period (Kepler's approx)
    - Stellar luminosity from `koi_srad` or `st_rad` and `koi_steff` or `st_teff`
    - Inferred insolation (`koi_insol`) from L/L_sun and Distance_AU
    - Equilibrium temperature `koi_teq` using t_eff and stellar radius
    """
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
    if out.get('stellar_lum_w') is None:
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
        L_rel = out.get('stellar_lum_ratio') or out.get('stellar_lum_w') and (out.get('stellar_lum_w') / L_SUN)
        teq = out.get('koi_teq')
        if a_au is not None and L_rel is not None:
            out['GZI'] = compute_gzi(float(a_au), float(L_rel))
        if out.get('GZI') is not None and teq is not None:
            out['HI'] = compute_hi(float(out['GZI']), float(teq))
    except Exception:
        pass

    return out


def generate_synthetic_samples(n: int, template: Dict[str, Any], spread: Dict[str, float] = None) -> List[Dict[str, Any]]:
    """Generate `n` synthetic candidate records by sampling around a `template` record.

    `spread` is a dict mapping numeric keys to fractional stddev (e.g., {'koi_prad': 0.2}).
    This generator is intentionally simple — use it to augment underrepresented classes.
    """
    import random
    out = []
    if spread is None:
        spread = {}
    for i in range(n):
        rec = dict(template)
        for k, v in list(template.items()):
            if isinstance(v, (int, float)) and v is not None and not isinstance(v, bool):
                frac = spread.get(k, 0.1)
                noise = random.gauss(0, abs(float(v) * frac) + 1e-6)
                rec[k] = float(v) + noise
        # Slight random categorical jitter for disposition if present
        if 'koi_disposition' in rec and rec['koi_disposition'] is not None:
            # keep same label most of the time
            if random.random() < 0.02:
                rec['koi_disposition'] = 'FALSE POSITIVE'
        # Derive attributes
        rec = derive_missing_attributes(rec)
        out.append(rec)
    return out
