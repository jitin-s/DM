// DevilMotion Ad Engine Configuration
// Set ADS_ENABLED to true to enable advertising.
export const ADS_ENABLED = true;

export const AD_CONFIG = {
  // Monetag (DISABLED by user request)
  monetag: {
    enabled: false,
    directLink: "",
    vignetteZone: "",
    popunderZone: "",
    pushZone: "",
  },
  // Adsterra (ACTIVE - high quality, non-intrusive placements)
  adsterra: {
    enabled: true,
    socialBarScript: "https://bauval.org/14/08f428f8ca2952fb932467bef2db4a47",
    nativeBanner: {
      containerId: "container-16be909fc62f62037ec1196397278a57",
      script: "https://bauval.org/21/16be909fc62f62037ec1196397278a57",
    },
    banner300x250: {
      key: "68b1b298ad50cf3bdfa7afb13018d1df",
      script: "https://bauval.org/22/68b1b298ad50cf3bdfa7afb13018d1df",
      width: 300,
      height: 250,
    },
  },
};


