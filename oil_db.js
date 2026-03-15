/**
 * ViscoPulse Master Database
 * University of Sri Jayewardenepura | B.Eng (Hons) Calibration
 */

const VISCOPULSE_CONFIG = {
    "constants": {
        "chamber_A_K": 3.516,       // Calibrated: 109.4 cSt / 31.115 s
        "chamber_B_K": 0.0256, 
        "diel_air_raw": 44          // Baseline raw value in air (Step 1 Test)
    },
    "brands": {
        "caltex": {
            "15w40": { v40: 109.4, v100: 14.5, diel_fresh_raw: 92 }, 
            "0w20": { v40: 45.2, v100: 8.7, diel_fresh_raw: 88 },
            "5w30": { v40: 68.5, v100: 11.8, diel_fresh_raw: 90 }
        },
        "toyota": {
            "0w20": { v40: 37.4, v100: 8.2, diel_fresh_raw: 86 },
            "5w30": { v40: 62.1, v100: 10.4, diel_fresh_raw: 89 }
        },
        "shell": {
            "0w20": { v40: 42.0, v100: 8.4, diel_fresh_raw: 87 },
            "5w30": { v40: 64.0, v100: 10.8, diel_fresh_raw: 91 }
        },
        "mobil": {
            "0w20": { v40: 44.5, v100: 8.6, diel_fresh_raw: 88 },
            "5w30": { v40: 66.2, v100: 11.1, diel_fresh_raw: 90 }
        }
    }
};

Object.freeze(VISCOPULSE_CONFIG);