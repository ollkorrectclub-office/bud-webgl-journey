import * as THREE from 'three';

const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1, 20),       // 0: Start
  new THREE.Vector3(0, -4, 0),       // 1: Entering field
  
  // Card 1 is at (-3, -4, -20)
  new THREE.Vector3(-3, -4, -15.0),  // 2: Card 1 Snap (5.0 units in front)
  new THREE.Vector3(-3, -4, -20),    // 3: Pass Card 1
  
  // Card 2 is at (3, -4, -40)
  new THREE.Vector3(3, -4, -35.0),   // 4: Card 2 Snap (5.0 units in front)
  new THREE.Vector3(3, -4, -40),     // 5: Pass Card 2
  
  // Card 3 is at (-3, -4, -60)
  new THREE.Vector3(-3, -4, -55.0),  // 6: Card 3 Snap (5.0 units in front)
  new THREE.Vector3(-3, -4, -60),    // 7: Pass Card 3
  
  // Card 4 is at (3, -4, -80)
  new THREE.Vector3(3, -4, -75.0),   // 8: Card 4 Snap (5.0 units in front)
  new THREE.Vector3(3, -4, -80),     // 9: Pass Card 4
  
  new THREE.Vector3(3, -4, -98.4),   // 10: Straight lane to stabilize tension
  
  new THREE.Vector3(0, -1, -105),    // 11: Title 1 Snap (10 units in front of -115)
  new THREE.Vector3(0, -1, -120),    // 12: Title 2 Snap (10 units in front of -130)
  new THREE.Vector3(0, -1, -135),    // 13: Title 3 Snap (10 units in front of -145)
  new THREE.Vector3(0, -1, -150),    // 14: Title 4 Snap (10 units in front of -160)
  new THREE.Vector3(0, -1, -170),    // 15: Title 5 Snap (10 units in front of -180)
  new THREE.Vector3(0, -1, -190),    // 16: End
]);

const snapPoints = [
  0,            // Start
  2 / 16,       // Card 1
  4 / 16,       // Card 2
  6 / 16,       // Card 3
  8 / 16,       // Card 4
  11 / 16,      // Title 1
  12 / 16,      // Title 2
  13 / 16,      // Title 3
  14 / 16,      // Title 4
  15 / 16,      // Title 5 (Klarheit)
  1.0           // End
];

const cards = [
  { name: "Card 1", pos: [-3, -4, -20] },
  { name: "Card 2", pos: [3, -4, -40] },
  { name: "Card 3", pos: [-3, -4, -60] },
  { name: "Card 4", pos: [3, -4, -80] },
];

console.log("Snap coordinates:");
snapPoints.forEach((t, i) => {
  const pt = curve.getPoint(t);
  let detail = "";
  if (i >= 1 && i <= 4) {
    const card = cards[i - 1];
    const dist = pt.distanceTo(new THREE.Vector3(...card.pos));
    const zDist = Math.abs(pt.z - card.pos[2]);
    detail = ` -> Target: ${card.name} ${JSON.stringify(card.pos)}, Z-dist = ${zDist.toFixed(2)}, 3D-dist = ${dist.toFixed(2)}`;
  }
  console.log(`Snap ${i}: t = ${t.toFixed(4)}, pos = [${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}, ${pt.z.toFixed(2)}]${detail}`);
});
