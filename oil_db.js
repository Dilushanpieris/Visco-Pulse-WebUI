const VISCOPULSE_CONFIG = {
    "constants": {
        "chamber_A_K": 3.516,       
        "diel_air_raw": 43,         
        "visc_tolerance_pct": 15    
    },
    "brands": {
        "caltex": {
            "20w50": { v40: 159.0, v100: 18.1, diel_fresh_raw: 49 },
            "15w40": { v40: 109.4, v100: 14.5, diel_fresh_raw: 49 },
            "0w20": { v40: 45.2, v100: 8.7, diel_fresh_raw: 48 },
            "5w30": { v40: 68.5, v100: 11.8, diel_fresh_raw: 49 }
        },
        "toyota": {
            "0w20": { v40: 37.4, v100: 8.2, diel_fresh_raw: 47 },
            "5w30": { v40: 62.1, v100: 10.4, diel_fresh_raw: 48 }
        },
        "shell": {
            "0w20": { v40: 42.0, v100: 8.4, diel_fresh_raw: 47 },
            "5w30": { v40: 64.0, v100: 10.8, diel_fresh_raw: 49 }
        },
        "mobil": {
            "0w20": { v40: 44.5, v100: 8.6, diel_fresh_raw: 48 },
            "5w30": { v40: 66.2, v100: 11.1, diel_fresh_raw: 49 }
        }
    }
};
Object.freeze(VISCOPULSE_CONFIG);