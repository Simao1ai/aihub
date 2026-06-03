export const LESA = {
  name: "LESA Inspections",
  owner: "Simao Alves",
  location: "Springfield, New Jersey",
  serviceArea: "all of New Jersey",
  phone: "1-844-537-2552",
  website: "https://lesainspections.com",
  scheduleUrl: "https://lesainspections.com/schedule/",
  tagline: "Delivering knowledge and peace of mind with every inspection",
  certifications: ["Licensed", "Insured", "InterNACHI Certified"],
  yearsInBusiness: 10,

  services: {
    core: [
      "Residential Home Inspection",
      "Pre-Sale (Pre-Listing) Inspection",
      "Commercial Building Inspection",
      "Rental Property Security Deposit Inspection",
    ],
    specialty: [
      "Radon Measurement",
      "Wood Destroying Insect (Termite) Inspection",
      "Oil Tank Sweep",
      "Mold Testing",
      "Sewer Scope",
      "Re-Inspection",
    ],
  },

  warranties: [
    "$100,000 of FREE warranties with every inspection",
    "90 Day Warranty on major systems",
    "18 Month extended warranty option",
    "Structural Warranty",
    "S.M.A.R.T Service Plan",
    "RecallChek appliance recall check",
    "Mold Safe",
    "Sewer Gard",
    "100% Satisfaction Guarantee — full refund + free re-inspection",
  ],

  advantages: [
    "$100K free warranties — far exceeds the industry standard",
    "100% Satisfaction Guarantee (refund + free re-inspection)",
    "Advanced reporting software with photo-documented reports",
    "Repair Request Estimator for quick repair cost estimates",
    "Concierge Service for post-inspection support",
    "Vetted contractor referral network",
    "Goes above and beyond NJ state standards of practice",
    "Mobile app on iOS and Android",
    "InterNACHI certified team",
  ],

  audiences: [
    "Homebuyers",
    "Home sellers (pre-listing)",
    "Real estate agents",
    "Real estate attorneys",
    "Landlords",
  ],

  brandVoice: [
    "Professional but warm and approachable — not stiff.",
    "Use we/our (not I/my) when representing the company.",
    "Lead with value: $100K warranties + satisfaction guarantee.",
    "Always include the phone number and website when relevant.",
    "Educational and trustworthy — you are the calm expert, never a hard-seller.",
    "Never overpromise or make claims a licensed inspector couldn't stand behind.",
  ],

  seasonalAngles: {
    1:  ["winter ice-dam and roof concerns", "frozen pipe risks", "heating system checks"],
    2:  ["radon awareness (cold months = closed homes = higher readings)", "attic insulation"],
    3:  ["spring market pre-listing inspections", "post-winter roof and gutter damage"],
    4:  ["spring buyer season", "oil tank sweeps before closing", "sump pump / water intrusion after thaw"],
    5:  ["peak buying season", "deck and exterior safety", "termite / WDI season"],
    6:  ["summer HVAC and AC performance checks", "mold from humidity"],
    7:  ["AC system stress in heat", "attic ventilation", "vacation-home / rental inspections"],
    8:  ["back-to-school relocation buyers", "sewer scope before purchase"],
    9:  ["fall market", "heating system pre-season checks", "chimney and fireplace safety"],
    10: ["furnace and CO safety before winter", "radon testing season begins", "roof prep for winter"],
    11: ["winterization", "oil tank concerns in older homes", "pre-holiday closings"],
    12: ["year-end closings", "heating reliability", "gift of peace of mind for new homeowners"],
  } as Record<number, string[]>,
};

export type LesaKnowledge = typeof LESA;
