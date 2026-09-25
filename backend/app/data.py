# PashuRaksha AI - Cattle Disease & Precaution Knowledge Base Data

DISEASES_DB = [
    {
        "id": "lsd",
        "name": "Lumpy Skin Disease (LSD)",
        "type": "new",
        "category": "viral",
        "pathogen": "Capripoxvirus (Vector transmitted via flies, ticks, mosquitoes)",
        "symptoms": ["skin_nodules", "high_fever", "drooling", "leg_swelling", "milk_drop"],
        "severity": "CRITICAL",
        "precautions": [
            "Immediate quarantine of affected animal in an insect-proof stall at least 50m away from herd",
            "Administer Goat Pox Vaccine to all healthy cattle above 4 months in the region",
            "Spray shed twice daily with Neem oil (5%) or Pyrethrin solution to eliminate vector insects",
            "Provide high-protein soft green fodder with EVM Betel-Pepper oral paste"
        ],
        "treatment": "Symptomatic treatment under vet supervision: Antipyretics, Antihistamines, Topical antiseptics",
        "evm_remedy": "Betel leaves (10 nos) + Black pepper (10g) + Salt (10g) + Jaggery (100g) paste given orally 3x daily"
    },
    {
        "id": "fmd",
        "name": "Foot & Mouth Disease (FMD / Khurpaka-Muhpaka)",
        "type": "old",
        "category": "viral",
        "pathogen": "Aphthovirus (Picornaviridae - highly contagious aerosol & contact)",
        "symptoms": ["mouth_blisters", "hoof_lesions", "drooling", "high_fever", "milk_drop"],
        "severity": "CRITICAL",
        "precautions": [
            "Strict isolation of sick animals; restrict movement of farm workers and vehicles",
            "Wash oral lesions with 1% Potassium Permanganate (KMnO4) solution",
            "Apply copper sulphate / disinfectant paste on hoof lesions after thorough cleaning",
            "Ensure bi-annual FMD vaccination under the National Animal Disease Control Programme (NADCP)"
        ],
        "treatment": "Supportive soft feed, antiseptic mouth & foot washes, systemic antibiotics for secondary infections",
        "evm_remedy": "Rinse mouth with mild baking soda or salt solution; apply Turmeric + Neem oil + Camphor paste on foot lesions"
    },
    {
        "id": "hs",
        "name": "Hemorrhagic Septicemia (HS / Gal Ghotu)",
        "type": "old",
        "category": "bacterial",
        "pathogen": "Pasteurella multocida (Bacterial, stress-induced in monsoon season)",
        "symptoms": ["throat_swelling", "high_fever", "respiratory_distress", "drooling", "sudden_collapse"],
        "severity": "EMERGENCY",
        "precautions": [
            "EMERGENCY: Contact Veterinary Doctor immediately for parenteral antibiotic administration",
            "Keep animal dry, elevated, and protected from cold rain or muddy waterlogged soil",
            "Administer annual pre-monsoon vaccination in May-June"
        ],
        "treatment": "High-dose antibiotics (Oxytetracycline, Sulpha drugs, or Ceftiofur) administered intravenously in early stages",
        "evm_remedy": "Warm compress on throat swelling; oral administration of dry ginger and turmeric paste with warm water"
    },
    {
        "id": "bq",
        "name": "Black Quarter (BQ / Chhuriya)",
        "type": "old",
        "category": "bacterial",
        "pathogen": "Clostridium chauvoei (Soil-borne anaerobic bacterial spores)",
        "symptoms": ["leg_swelling", "high_fever", "sudden_collapse"],
        "severity": "HIGH",
        "precautions": [
            "Crepitant (crackling sound) painful swelling in hindquarters or shoulder muscles",
            "Immediate high-dose Penicillin under vet supervision before toxin spread",
            "Deep burial of deceased animals with quicklime to prevent soil spore contamination"
        ],
        "treatment": "Large doses of crystalline Penicillin IV/IM, incision of swelling to drain gas and fluids",
        "evm_remedy": "Topical camphor and warm eucalyptus oil massage around muscle swellings for temporary pain relief"
    },
    {
        "id": "mastitis",
        "name": "Bovine Mastitis (Udder Inflammation)",
        "type": "old",
        "category": "bacterial",
        "pathogen": "Staphylococcus aureus / Streptococcus agalactiae (Hygiene failure)",
        "symptoms": ["udder_swelling", "milk_drop", "moderate_fever"],
        "severity": "MODERATE",
        "precautions": [
            "Teat dipping in 0.5% Iodine solution post-milking",
            "Apply Aloe Vera + Turmeric + Lime EVM paste on udder 5 times daily",
            "Complete intramammary antibiotic therapy during dry-cow period under vet guidance"
        ],
        "treatment": "Intramammary antibiotic infusion, NSAIDs for pain and edema reduction",
        "evm_remedy": "Aloe Vera gel (250g) + Turmeric powder (50g) + Lime/Chunnam (15g) blended paste applied on udder"
    },
    {
        "id": "h5n1_dairy",
        "name": "Avian Influenza (H5N1 in Dairy Cattle)",
        "type": "new",
        "category": "viral",
        "pathogen": "Influenza A virus (Cross-species transmission from wild migratory birds)",
        "symptoms": ["milk_drop", "moderate_fever", "respiratory_distress"],
        "severity": "EMERGENCY THREAT",
        "precautions": [
            "Prevent poultry and wild birds from accessing cattle feed troughs and waterers",
            "Pasteurize all milk before consumption or calf feeding",
            "Monitor for thick, colostrum-like yellow milk with dramatic milk drop in lactating cows"
        ],
        "treatment": "Supportive hydration, anti-inflammatory therapy, isolation",
        "evm_remedy": "Herbal immune boosters: Tulsi leaf juice + Giloy stem extract + Turmeric powder given daily"
    }
]

VACCINATION_SCHEDULE = [
    {
        "disease": "Foot & Mouth Disease (FMD)",
        "primary_dose": "4 months of age",
        "booster": "Booster at 1 month after 1st dose, then Bi-annually",
        "recommended_time": "Pre-monsoon (May & November)",
        "program": "National Animal Disease Control Programme (NADCP)"
    },
    {
        "disease": "Lumpy Skin Disease (LSD)",
        "primary_dose": "4 months of age (Goat Pox Vaccine)",
        "booster": "Annual Booster",
        "recommended_time": "Before Vector Season (March-April)",
        "program": "State Livestock Protection Drive"
    },
    {
        "disease": "Hemorrhagic Septicemia (HS)",
        "primary_dose": "6 months of age",
        "booster": "Annual Booster",
        "recommended_time": "Pre-monsoon (May-June)",
        "program": "State Veterinary Services"
    },
    {
        "disease": "Black Quarter (BQ)",
        "primary_dose": "6 months of age",
        "booster": "Annual Booster",
        "recommended_time": "Pre-monsoon (May-June)",
        "program": "State Veterinary Services"
    },
    {
        "disease": "Brucellosis (Calfhood)",
        "primary_dose": "Female Calves (4 to 8 months ONLY)",
        "booster": "Single Dose (Lifetime Immunity)",
        "recommended_time": "Anytime in 4-8 month calfhood window",
        "program": "NADCP Brucellosis Control Program"
    }
]
