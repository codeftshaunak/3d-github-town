/**
 * Generate building position using an expanding spiral ring layout.
 * This supports infinite buildings by adding more rings as needed.
 */
export function generateBuildingPosition(index, total) {
  if (index === 0) return { x: 0, z: 0 };

  // Dynamic ring system: rings grow outward with increasing capacity
  // Ring N has capacity = 6 * (N + 1), radius = 10 * (N + 1)
  let remaining = index - 1;
  let ringIndex = 0;

  while (true) {
    const capacity = 6 * (ringIndex + 1);
    const radius = 10 + ringIndex * 12;

    if (remaining < capacity) {
      const angle = (remaining / capacity) * Math.PI * 2;
      // Add slight jitter so buildings don't line up perfectly
      const jitter = (seededRandom(index * 7 + 3) - 0.5) * 3;
      const radiusJitter = (seededRandom(index * 13 + 7) - 0.5) * 4;
      return {
        x: Math.cos(angle) * (radius + radiusJitter) + jitter,
        z: Math.sin(angle) * (radius + radiusJitter) + jitter,
      };
    }

    remaining -= capacity;
    ringIndex++;
  }
}

// Simple seeded pseudo-random to keep positions stable across re-renders
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function generateBuildingGeometry(user) {
  const followers = user.followers || 0;
  const repos = user.public_repos || 0;
  const following = user.following || 0;

  // Height based on followers (logarithmic scale)
  const base = 4;
  const followerHeight = Math.log10(Math.max(1, followers)) * 3;
  const repoHeight = Math.log10(Math.max(1, repos)) * 2;
  const height = Math.min(30, base + followerHeight + repoHeight);

  // Width based on repos
  const width = Math.max(2, Math.min(6, 2 + Math.log10(Math.max(1, repos)) * 0.9));

  // Depth based on following
  const depth = Math.max(2, Math.min(6, 2 + Math.log10(Math.max(1, following + 1)) * 0.9));

  return { width, depth, height };
}

export function getBuildingColor(user) {
  const login = user.login || '';

  // Hash the username to get a consistent color
  let hash = 0;
  for (let i = 0; i < login.length; i++) {
    hash = login.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { main: 0x0d2137, emissive: 0x003366, accent: 0x0066ff },
    { main: 0x1a0d37, emissive: 0x330066, accent: 0x8833ff },
    { main: 0x0d2420, emissive: 0x003322, accent: 0x00cc88 },
    { main: 0x2a1200, emissive: 0x441100, accent: 0xff6600 },
    { main: 0x2a2000, emissive: 0x443300, accent: 0xffaa00 },
    { main: 0x2a0d1a, emissive: 0x440022, accent: 0xff3388 },
    { main: 0x0d2530, emissive: 0x003344, accent: 0x00ccff },
    { main: 0x1a2500, emissive: 0x223300, accent: 0x88ff00 },
    { main: 0x1a0a2a, emissive: 0x2d0050, accent: 0xcc00ff },
    { main: 0x001a2a, emissive: 0x002244, accent: 0x00ffee },
    { main: 0x2a1500, emissive: 0x3d2000, accent: 0xff8800 },
    { main: 0x0a1a0a, emissive: 0x0d2e0d, accent: 0x44ff44 },
  ];

  const paletteIndex = Math.abs(hash) % palettes.length;
  return { ...palettes[paletteIndex] };
}

export function getArchitectureStyle(user) {
  const repos = user.public_repos || 0;
  if (repos > 100) return 'skyscraper';
  if (repos > 50) return 'highrise';
  if (repos > 20) return 'midrise';
  if (repos > 5) return 'lowrise';
  return 'cottage';
}