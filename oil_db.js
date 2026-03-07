/**
 * ViscoPulse Master Database
 * Configuration for Brands, Grades, and Hardware Constants
 */

const VISCOPULSE_CONFIG = {
    "constants": {
        "chamber_A_K": 0.0254, 
        "chamber_B_K": 0.0256  
    },
    "brands": {
        "toyota": {
            "0w20": { v40: 37.4, v100: 8.2, diel_fresh: 1320 },
            "5w30": { v40: 62.1, v100: 10.4, diel_fresh: 1380 }
        },
        "caltex": {
            "0w20": { v40: 45.2, v100: 8.7, diel_fresh: 1345 },
            "5w30": { v40: 68.5, v100: 11.8, diel_fresh: 1410 }
        },
        "shell": {
            "0w20": { v40: 42.0, v100: 8.4, diel_fresh: 1335 },
            "5w30": { v40: 64.0, v100: 10.8, diel_fresh: 1395 }
        },
        "mobil": {
            "0w20": { v40: 44.5, v100: 8.6, diel_fresh: 1340 },
            "5w30": { v40: 66.2, v100: 11.1, diel_fresh: 1405 }
        }
    }
};

Object.freeze(VISCOPULSE_CONFIG);