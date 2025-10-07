import pandas as pd
import numpy as np
import tensorflow as tf
import os
import pickle
import json
import matplotlib.pyplot as plt
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, Dropout, Conv1D, MaxPooling1D, Flatten, Input, concatenate
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, mean_squared_error, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

# --- Configuration ---
RANDOM_SEED = 42
KEPLER_FILE = "kepler_koi.csv.csv"
K2_FILE = "k2_candidates.csv.csv"
TESS_FILE = "tess_toi.csv.csv"
WEIGHTS_FILE = "combined_weights.weights.h5"
ARTIFACTS_DIR = "results"

# If an older 'artifacts' folder exists from previous runs, migrate it to 'results'
if os.path.exists('artifacts') and not os.path.exists(ARTIFACTS_DIR):
    try:
        os.rename('artifacts', ARTIFACTS_DIR)
        print(f"Renamed existing 'artifacts' directory to '{ARTIFACTS_DIR}'")
    except Exception:
        # non-fatal; we'll create results directory later when needed
        pass
TARGET_CLASS = "koi_disposition"
LC_LEN = 500  # Standardized length for the simulated light curve

# Revised Features for both missions (8 features)
TABULAR_FEATURES = [
    'koi_teq', 'koi_insol', 'koi_steff', 'koi_srad',
    'koi_slogg', 'ra', 'dec', 'koi_kepmag'
]
# Features required for LC SIMULATION and REGRESSION targets
LC_SIMULATION_FEATURES = ['koi_period', 'koi_duration', 'koi_depth', 'koi_prad']

# Mappings from source mission names to Kepler's target schema (koi_)
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
# 1. Engineer Regression Targets
# =====================
def compute_distance_au(period_days):
    """Approximate semi-major axis from orbital period (Kepler's law simplified)."""
    return (period_days / 365.0) ** (2/3)

def compute_water_prob(radius, temp):
    """Simple estimation of water potential based on size and temperature."""
    if radius < 2 and 200 <= temp <= 350:
        return 1.0 # High water potential (Earth-like size/temp)
    elif radius < 3 and 150 <= temp <= 400:
        return 0.5 # Medium water potential (Super-Earth size)
    return 0.0

def compute_atmosphere_prob(radius):
    """Simple estimation of atmosphere retention potential based on size."""
    return min(1.0, radius / 10.0)

def compute_habitability_prob(water_prob, atm_prob, insol):
    """Combined habitability score emphasizing water, atmosphere, and insolation near 1."""
    # Insolation: Earth is 1. Closer to 1 is better.
    return 0.5 * water_prob + 0.3 * atm_prob + 0.2 * (1 / (1 + abs(insol - 1)))

# =====================
# 2. Simulated Light Curve (LC) Generation
# =====================
def simulate_light_curve(row, lc_len, target_col):
    """
    Generates a synthetic light curve based on transit parameters and disposition.
    """
    # Use a seed based on the index and a constant for reproducibility across runs
    np.random.seed(int(row.name * RANDOM_SEED) % (2**32 - 1))

    disposition = row[target_col]
    dip_depth_normalized = row['koi_depth'] / 100000.0 if row.get('koi_depth', 0) > 0 else 0.0

    # Standardized disposition checks
    is_candidate = disposition == 'CANDIDATE'
    is_confirmed = disposition == 'CONFIRMED'

    if is_candidate:
        noise_level = 0.01
        dip = dip_depth_normalized * np.random.uniform(0.3, 0.7)
    elif is_confirmed:
        noise_level = 0.003
        dip = dip_depth_normalized
    else: # FALSE POSITIVE
        noise_level = 0.005
        dip = 0.0

    lc = 1.0 + np.random.normal(0, noise_level, lc_len)

    if dip > 0:
        transit_duration_hours = row.get('koi_duration', 1.0)
        # Approximate duration steps: (hours / 24 * length / 10 periods)
        transit_duration_steps = int(transit_duration_hours / 24.0 * lc_len / 10.0) 
        transit_duration_steps = max(5, min(transit_duration_steps, lc_len // 6))
        center = lc_len // 2
        start = center - transit_duration_steps // 2
        end = center + transit_duration_steps // 2
        lc[start:end] -= dip

    lc = (lc - np.mean(lc)) / (np.std(lc) + 1e-6)
    return lc

# =====================
# 3. Build Model Function
# =====================
def build_hybrid_model(tab_features_count, n_classes, reg_outputs_count, lc_len):
    """Defines the two-input, two-output hybrid CNN/FCN model architecture."""
    # 1. Tabular Input Branch (FCN)
    tab_inp = Input(shape=(tab_features_count,), name='tabular_input')
    tab_branch = Dense(64, activation="relu")(tab_inp)
    tab_branch = Dropout(0.3)(tab_branch)

    # 2. Light Curve (LC) Input Branch (1D CNN)
    lc_inp = Input(shape=(lc_len, 1), name='lc_input')
    lc_branch = Conv1D(32, 5, activation="relu", padding="same")(lc_inp)
    lc_branch = MaxPooling1D(4)(lc_branch)
    lc_branch = Dropout(0.3)(lc_branch)
    lc_branch = Conv1D(64, 5, activation="relu", padding="same")(lc_branch)
    lc_branch = MaxPooling1D(4)(lc_branch)
    lc_branch = Dropout(0.3)(lc_branch)
    lc_branch = Flatten()(lc_branch)

    # 3. Fusion Layer
    shared = concatenate([tab_branch, lc_branch], name='fusion_layer')
    shared = Dense(128, activation="relu")(shared)
    shared = Dropout(0.5)(shared)

    # Classification head
    class_out = Dense(n_classes, activation="softmax", name="class_output")(shared)
    # Regression head
    reg_out = Dense(reg_outputs_count, activation="linear", name="reg_output")(shared)

    model = Model(inputs=[tab_inp, lc_inp], outputs=[class_out, reg_out])
    return model

# =====================
# 4. Data Loading and Standardizing
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
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Skipping {mission_type} data.")
        return pd.DataFrame()

    mission_map = COLUMN_MAPPINGS[mission_type]

    # Target column names based on the Kepler schema (koi_)
    target_names = {
        'id_name': 'id_name', 'disp': 'koi_disposition', 'period': 'koi_period',
        'duration': 'koi_duration', 'depth': 'koi_depth', 'prad': 'koi_prad',
        'teq': 'koi_teq', 'insol': 'koi_insol', 'steff': 'koi_steff',
        'srad': 'koi_srad', 'slogg': 'koi_slogg', 'mag': 'koi_kepmag',
        'ra': 'ra', 'dec': 'dec'
    }

    # Build the final renaming map: source_col -> target_col (koi_name)
    final_rename_map = {}
    for key, source_col in mission_map.items():
        if source_col is not None and source_col in df.columns and key in target_names:
            final_rename_map[source_col] = target_names[key]

    df = df.rename(columns=final_rename_map)

    # Standardize Disposition Label
    if 'koi_disposition' in df.columns:
        df['koi_disposition'] = df['koi_disposition'].apply(standardize_disposition)

    # Add a mission identifier and filter columns
    df['mission'] = mission_type
    cols_to_keep = list(target_names.values()) + ['mission']
    return df[[col for col in cols_to_keep if col in df.columns]]


# =====================
# 5. Combined Training Pipeline
# =====================
def train_combined_model_fixed():
    print("\n--- Starting Combined Data Preparation (Kepler, K2, TESS) ---")

    # Load and standardize all datasets
    df_kepler = load_and_standardize_data(KEPLER_FILE, 'kepler')
    df_k2 = load_and_standardize_data(K2_FILE, 'k2')
    df_tess = load_and_standardize_data(TESS_FILE, 'tess')

    # Combine dataframes
    df_combined = pd.concat([df_kepler, df_k2, df_tess], ignore_index=True)

    # Engineer regression features
    df_combined["Distance_AU"] = df_combined["koi_period"].apply(compute_distance_au)
    df_combined["Water_Prob"] = df_combined.apply(lambda r: compute_water_prob(r.get("koi_prad", np.nan), r.get("koi_teq", np.nan)), axis=1)
    df_combined["Atmosphere_Prob"] = df_combined["koi_prad"].apply(compute_atmosphere_prob)
    df_combined["Habitability_Prob"] = df_combined.apply(
        lambda r: compute_habitability_prob(r["Water_Prob"], r["Atmosphere_Prob"], r.get("koi_insol", np.nan)), axis=1
    )

    regression_targets = ["koi_prad", "Distance_AU", "Water_Prob", "Atmosphere_Prob", "Habitability_Prob"]
    
    # Fill missing values
    all_features = TABULAR_FEATURES + LC_SIMULATION_FEATURES
    for col in all_features + regression_targets:
        if col in df_combined.columns:
            df_combined[col] = df_combined[col].fillna(df_combined[col].mean())

    # Drop rows missing target class
    df_combined = df_combined.dropna(subset=[TARGET_CLASS]).reset_index(drop=True)
    print(f"Total Training Samples (after cleaning): {len(df_combined)}")

    # Encode classification labels
    label_enc = LabelEncoder()
    y_class = label_enc.fit_transform(df_combined[TARGET_CLASS])
    n_classes = len(np.unique(y_class))

    # Regression labels
    y_reg = df_combined[regression_targets].values

    # Tabular input
    X_tab = df_combined[TABULAR_FEATURES].values
    tab_scaler = StandardScaler()
    X_tab_scaled = tab_scaler.fit_transform(X_tab)

    # Light curve input
    X_lc_list = df_combined.apply(lambda row: simulate_light_curve(row, LC_LEN, TARGET_CLASS), axis=1).tolist()
    X_lc = np.array(X_lc_list)
    X_lc_scaled = np.expand_dims(X_lc, axis=2)

    # Split data
    X_tab_train, X_tab_test, X_lc_train, X_lc_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X_tab_scaled, X_lc_scaled, y_class, y_reg, test_size=0.2, random_state=RANDOM_SEED, stratify=y_class
    )

    # Compute class weights
    class_weights_list = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(y_class_train),
        y=y_class_train
    )
    class_weight_dict = {i: float(w) for i, w in enumerate(class_weights_list)}
    print(f"Calculated Classification Class Weights: {class_weight_dict}")

    # Per-sample weights
    sample_weights_train_cls = np.array([class_weight_dict[c] for c in y_class_train])
    sample_weights_train_reg = np.ones(len(y_reg_train))

    # Keras expects x and y ordering to match model inputs/outputs when passing lists.
    # Provide sample weights as a list matching the outputs order [class_output, reg_output].
    sample_weight_for_fit = [
        np.array([float(w) for w in sample_weights_train_cls]),
        np.array([float(w) for w in sample_weights_train_reg])
    ]

    # Build model
    model = build_hybrid_model(len(TABULAR_FEATURES), n_classes, len(regression_targets), LC_LEN)
    model.compile(
        optimizer="adam",
        loss={"class_output": "sparse_categorical_crossentropy", "reg_output": "mse"},
        loss_weights={"class_output": 0.7, "reg_output": 0.3},
        metrics={"class_output": "accuracy", "reg_output": "mse"}
    )

    # Ensure artifacts directory exists
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    print("\n--- Starting Hybrid Model Training (Combined Data) ---")
    history = model.fit(
        [X_tab_train, X_lc_train],
        [y_class_train, y_reg_train],
        validation_data=(
            [X_tab_test, X_lc_test],
            [y_class_test, y_reg_test]
        ),
        sample_weight=sample_weight_for_fit,
        epochs=15,
        batch_size=32,
        verbose=1
    )

    # Save weights and full model (try h5 then SavedModel)
    weights_path = os.path.join(ARTIFACTS_DIR, WEIGHTS_FILE)
    model.save_weights(weights_path)
    try:
        model.save(os.path.join(ARTIFACTS_DIR, "combined_model.h5"))
    except Exception:
        model.save(os.path.join(ARTIFACTS_DIR, "combined_model_saved"))

    # Save scalers and encoders
    with open(os.path.join(ARTIFACTS_DIR, "tab_scaler.pkl"), "wb") as f:
        pickle.dump(tab_scaler, f)
    with open(os.path.join(ARTIFACTS_DIR, "label_encoder.pkl"), "wb") as f:
        pickle.dump(label_enc, f)
    with open(os.path.join(ARTIFACTS_DIR, "regression_targets.json"), "w") as f:
        json.dump(regression_targets, f)

    # Save training history
    hist_df = pd.DataFrame(history.history)
    hist_df.to_csv(os.path.join(ARTIFACTS_DIR, "training_history.csv"), index=False)

    # Plot training metrics
    try:
        plt.figure(figsize=(10, 5))
        for key, vals in history.history.items():
            plt.plot(vals, label=key)
        plt.legend()
        plt.title('Training history')
        plt.xlabel('epoch')
        plt.tight_layout()
        plt.savefig(os.path.join(ARTIFACTS_DIR, 'training_history.png'))
        plt.close()
    except Exception:
        pass

    # --- Evaluation on test set: confusion matrix and classification report ---
    try:
        # Predict on test set
        y_prob_test, _ = model.predict([X_tab_test, X_lc_test], verbose=0)
        y_pred_test = np.argmax(y_prob_test, axis=1)

        # Confusion matrix
        cm = confusion_matrix(y_class_test, y_pred_test)
        plt.figure(figsize=(6, 5))
        plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title('Confusion Matrix (Test)')
        plt.colorbar()
        tick_marks = np.arange(len(label_enc.classes_))
        plt.xticks(tick_marks, label_enc.classes_, rotation=45, ha='right')
        plt.yticks(tick_marks, label_enc.classes_)
        plt.ylabel('True label')
        plt.xlabel('Predicted label')
        # annotate
        thresh = cm.max() / 2.
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                plt.text(j, i, format(cm[i, j], 'd'), horizontalalignment='center',
                         color='white' if cm[i, j] > thresh else 'black')
        plt.tight_layout()
        plt.savefig(os.path.join(ARTIFACTS_DIR, 'confusion_matrix.png'))
        plt.close()

        # Classification report
        cr_dict = classification_report(y_class_test, y_pred_test, target_names=list(label_enc.classes_), output_dict=True)
        cr_txt = classification_report(y_class_test, y_pred_test, target_names=list(label_enc.classes_))
        # Save text report
        with open(os.path.join(ARTIFACTS_DIR, 'classification_report.txt'), 'w') as f:
            f.write(cr_txt)
        # Save CSV version
        cr_df = pd.DataFrame(cr_dict).transpose()
        cr_df.to_csv(os.path.join(ARTIFACTS_DIR, 'classification_report.csv'))

        # Plot precision/recall/f1 for each class
        try:
            metrics_df = cr_df.loc[label_enc.classes_, ['precision', 'recall', 'f1-score']]
            metrics_df.plot(kind='bar', figsize=(8,5))
            plt.title('Classification metrics by class')
            plt.ylabel('score')
            plt.ylim(0,1)
            plt.tight_layout()
            plt.savefig(os.path.join(ARTIFACTS_DIR, 'classification_metrics_by_class.png'))
            plt.close()
        except Exception:
            pass
    except Exception:
        # Non-fatal: continue even if evaluation plotting fails
        pass

    print(f"Saved artifacts to {ARTIFACTS_DIR}")

    return tab_scaler, label_enc, regression_targets, model


# =====================
# 6. TESS Inference Pipeline
# =====================

def prepare_tess_data_for_inference(tab_scaler, lc_len):
    """Prepares the original TESS data for inference using the combined model's scaler."""

    # Load original TESS data for raw features later
    df_original_tess_raw = pd.read_csv(TESS_FILE)
    df_original_tess_raw['TOI_ID'] = df_original_tess_raw['toi'].astype(str)

    # Standardize column names for processing (gets koi_disposition from tfopwg_disp)
    df_tess_renamed = load_and_standardize_data(TESS_FILE, 'tess')

    # Engineer pseudo-regression targets (for consistent imputation)
    df_tess_renamed["Distance_AU"] = df_tess_renamed["koi_period"].apply(compute_distance_au)
    df_tess_renamed["Water_Prob"] = df_tess_renamed.apply(lambda r: compute_water_prob(r.get("koi_prad", np.nan), r.get("koi_teq", np.nan)), axis=1)
    df_tess_renamed["Atmosphere_Prob"] = df_tess_renamed["koi_prad"].apply(compute_atmosphere_prob)
    df_tess_renamed["Habitability_Prob"] = df_tess_renamed.apply(
        lambda r: compute_habitability_prob(r["Water_Prob"], r["Atmosphere_Prob"], r.get("koi_insol", np.nan)), axis=1
    )

    # Impute missing values with the means from the combined training set
    all_cols = TABULAR_FEATURES + LC_SIMULATION_FEATURES
    for col in all_cols:
        if col in df_tess_renamed.columns:
            df_tess_renamed[col] = df_tess_renamed[col].fillna(df_tess_renamed[col].mean())

    # Tabular Input: Scale with the combined model's Scaler
    X_tab_tess = df_tess_renamed[TABULAR_FEATURES].values
    X_tab_tess_scaled = tab_scaler.transform(X_tab_tess)

    # Light Curve Input: Simulate
    X_lc_list_tess = df_tess_renamed.apply(lambda row: simulate_light_curve(row, lc_len, TARGET_CLASS), axis=1).tolist()
    X_lc_tess = np.array(X_lc_list_tess)
    X_lc_tess_scaled = np.expand_dims(X_lc_tess, axis=2)

    tess_ids = df_tess_renamed['id_name'].astype(str)

    return X_tab_tess_scaled, X_lc_tess_scaled, tess_ids, df_tess_renamed, df_original_tess_raw

# =====================
# 7. Layman's Explanation Logic
# =====================
def explain_planet_in_laymans_terms(row, confidence_threshold):
    """Generates a detailed, easy-to-understand profile of the planet."""

    # Raw Features
    period = row['pl_orbper']
    radius_e = row['pl_rade']
    teq_k = row['pl_eqt']
    star_temp_k = row['st_teff']
    star_radius_s = row['st_rad']

    # Inferred Metrics
    confidence = row['Predicted_Confidence']
    distance_au = row['Inferred_Distance_AU']
    habitability_prob = row['Inferred_Habitability_Prob']
    water_prob = row['Inferred_Water_Prob']

    # Unit Conversions and Comparisons
    teq_c = teq_k - 273.15 # Kelvin to Celsius
    star_color = "Sun-like yellow/white" if 5000 <= star_temp_k <= 6000 else \
                 "Red/Orange Dwarf" if star_temp_k < 5000 else \
                 "Blue/White Giant"

    # Layman's Summaries
    size_desc = f"It is a **{radius_e:.2f} times the radius of Earth**."
    if radius_e < 1.2:
        size_type = "Rocky, Earth-sized"
    elif radius_e < 2.5:
        size_type = "Super-Earth or Mini-Neptune"
    else:
        size_type = "Gas Giant (Neptune or Jupiter-sized)"

    orbit_desc = f"The planet's year lasts **{period:.2f} Earth days**, meaning it orbits its star very closely."
    if period > 365:
        orbit_desc = f"The planet's year lasts **{period/365.25:.2f} Earth years**, placing it farther out than Earth."

    temp_desc = f"Its estimated equilibrium temperature is **{teq_k:.0f} Kelvin** ({teq_c:.0f}°C or {teq_c*1.8+32:.0f}°F)."

    hab_desc = f"The model infers a **{habitability_prob*100:.0f}% chance of habitability**, mainly due to its position."
    if habitability_prob < 0.2:
        hab_desc = "It has a **low chance of habitability**, likely too hot or too cold."
    elif habitability_prob >= 0.7:
        hab_desc = "It shows **strong potential for being habitable** (high Water/Atmosphere probability)."

    star_desc = f"The host star is a **{star_color}** (effective temperature: {star_temp_k:.0f} K) and is **{star_radius_s:.2f} times the size of our Sun.**"

    confidence_desc = f"The prediction that this planet is **Confirmed** is made with a **{confidence*100:.2f}% certainty**."


    print("\n" + "="*80)
    print(f"HIGH-CONFIDENCE CONFIRMED PLANET: TOI {row['TOI_ID']}")
    print("="*80)

    print(f"**Classification Certainty:** {confidence_desc}")
    print(f"**Planet Type:** {size_type}. {size_desc}")
    print(f"**Orbital Period:** {orbit_desc}")
    print(f"**Orbital Distance:** It orbits at **{distance_au:.3f} AU** (where 1 AU is the Earth-Sun distance).")
    print(f"**Temperature:** {temp_desc}")

    print("\n**Inferred Potential for Life (Habitability Metrics):**")
    print(f"   - **Habitability Score:** {hab_desc}")
    print(f"   - **Water Potential:** The planet has a **{water_prob*100:.0f}% probability** of being capable of holding surface water based on its size and temperature.")

    print("\n**Host Star Characteristics:**")
    print(f"   - **Star Details:** {star_desc}")
    print(f"   - **Stellar Gravity (logg):** {row['st_logg']:.2f}")

    print("="*80)


def get_high_confidence_data(df_original_tess_raw, results_df, confidence_threshold=0.95):
    """
    Filters prediction results for CONFIRMED class with high confidence
    and generates the layman's explanation for each.
    """
    # Filter for CONFIRMED status AND high confidence
    high_conf_confirmed = results_df[
        (results_df['Predicted_Confidence'] >= confidence_threshold) &
        (results_df['Most_Confident_Class'] == 'CONFIRMED')
    ].copy()

    if high_conf_confirmed.empty:
        print(f"\nNo predictions found CONFIRMED with confidence >= {confidence_threshold:.2f}.")
        return None

    # Merge the high-confidence predictions back onto the original TESS data for raw features
    cols_to_keep_from_original = [
        'toi', 'pl_orbper', 'pl_trandurh', 'pl_trandep', 'pl_rade',
        'pl_insol', 'pl_eqt', 'st_teff', 'st_logg', 'st_rad'
    ]

    # Reload and Rename 'toi' in raw data for merging
    df_original_tess_raw = pd.read_csv(TESS_FILE).rename(columns={'toi': 'TOI_ID'})

    # Ensure the merge key has consistent dtype (string) on both sides
    if 'TOI_ID' in high_conf_confirmed.columns:
        high_conf_confirmed['TOI_ID'] = high_conf_confirmed['TOI_ID'].astype(str)
    if 'TOI_ID' in df_original_tess_raw.columns:
        df_original_tess_raw['TOI_ID'] = df_original_tess_raw['TOI_ID'].astype(str)

    full_data = pd.merge(
        high_conf_confirmed,
        df_original_tess_raw[['TOI_ID'] + [col for col in cols_to_keep_from_original if col in df_original_tess_raw.columns]],
        on='TOI_ID',
        how='left'
    )

    print(f"\n\n#################################################")
    print(f"--- Confirmed Planets with Model Confidence >= {confidence_threshold:.2f} ---")
    print(f"Total High Confidence Confirmed Samples: {len(full_data)}")
    print("#################################################")

    # Generate layman's explanation for each confirmed planet
    for _, row in full_data.iterrows():
        explain_planet_in_laymans_terms(row, confidence_threshold)

    return full_data


def run_tess_inference(tab_scaler, label_enc, regression_targets, model):
    """Runs the model on TESS data and processes the results."""
    print("\n\n#################################################")
    print("--- STARTING TESS INFERENCE (USING COMBINED MODEL) ---")
    print("#################################################")

    # 1. Prepare TESS Data using Combined Model's Scaler
    X_tab_tess, X_lc_tess, tess_ids, df_tess_renamed, df_original_tess_raw = prepare_tess_data_for_inference(
        tab_scaler, LC_LEN
    )

    # 2. Predict on TESS Data
    tess_pred_class, tess_pred_reg = model.predict([X_tab_tess, X_lc_tess], verbose=0)

    # 3. Process Classification Results
    max_prob = np.max(tess_pred_class, axis=1)
    max_class_index = np.argmax(tess_pred_class, axis=1)
    most_confident_class = label_enc.inverse_transform(max_class_index)

    # Create output DataFrame
    results_df = pd.DataFrame({
        "TOI_ID": tess_ids,
        "Predicted_Confidence": max_prob,
        "Most_Confident_Class": most_confident_class,
    })

    # 4. Process Regression Results (Habitability Metrics)
    reg_df = pd.DataFrame(tess_pred_reg, columns=[f"Inferred_{t}" for t in regression_targets])
    results_df = pd.concat([results_df, reg_df], axis=1)

    # 5. Get all data for high confidence CONFIRMED predictions (and explain them)
    # Save results CSV
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    results_csv = os.path.join(ARTIFACTS_DIR, 'tess_inference_predictions.csv')
    results_df.to_csv(results_csv, index=False)

    # Save a histogram of predicted confidences
    try:
        plt.figure(figsize=(6,4))
        plt.hist(results_df['Predicted_Confidence'], bins=50)
        plt.title('TESS Predicted Confidence Distribution')
        plt.xlabel('Predicted Confidence')
        plt.ylabel('Count')
        plt.tight_layout()
        plt.savefig(os.path.join(ARTIFACTS_DIR, 'tess_confidence_histogram.png'))
        plt.close()
    except Exception:
        pass

    get_high_confidence_data(df_original_tess_raw, results_df, confidence_threshold=0.95)


# =====================
# 8. Main Execution
# =====================
if __name__ == "__main__":
    # --- 8.1 Run Combined Training and Save Weights ---
    tab_scaler, label_enc, regression_targets, model = train_combined_model_fixed()

    # --- 8.2 Run TESS Inference using the Combined model ---
    run_tess_inference(tab_scaler, label_enc, regression_targets, model)
