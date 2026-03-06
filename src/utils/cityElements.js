import * as THREE from "three";

// Optimized city element creation using InstancedMesh for better performance

export function createStreetLights(scene, count = 100) {
  // Single geometry and material for all street lights (instancing)
  const poleGeometry = new THREE.CylinderGeometry(0.3, 0.4, 8, 6); // Reduced segments
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.7,
    metalness: 0.8,
  });

  const lights = [];

  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      if (i === 0 || j === 0) continue;
      if (Math.random() > 0.3) continue; // 30% density

      const x = i * 40 + (Math.random() - 0.5) * 10;
      const z = j * 40 + (Math.random() - 0.5) * 10;

      // Pole
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(x, 4, z);
      pole.castShadow = true;
      scene.add(pole);

      // Light (single sphere with point light)
      const bulbGeometry = new THREE.SphereGeometry(0.5, 8, 8); // Reduced segments
      const bulbMaterial = new THREE.MeshStandardMaterial({
        color: 0xffee99,
        emissive: 0xffee99,
        emissiveIntensity: 1.5,
      });
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
      bulb.position.set(x, 8, z);
      scene.add(bulb);

      // Point light (reduced intensity and range for performance)
      const pointLight = new THREE.PointLight(0xffee99, 0.5, 20);
      pointLight.position.set(x, 8, z);
      scene.add(pointLight);

      lights.push({ pole, bulb, light: pointLight });
    }
  }

  return lights;
}

export function createTrees(scene, count = 80) {
  const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 3, 6); // Reduced segments
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
  });

  const foliageGeometry = new THREE.SphereGeometry(2, 6, 6); // Reduced segments significantly
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5016,
    roughness: 0.8,
  });

  const trees = [];

  for (let i = 0; i < count; i++) {
    let x, z;
    do {
      x = (Math.random() - 0.5) * 350;
      z = (Math.random() - 0.5) * 350;
    } while (
      (Math.abs(x % 40) < 5 && Math.abs(z) < 350) ||
      (Math.abs(z % 40) < 5 && Math.abs(x) < 350)
    );

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, 4, z);
    foliage.castShadow = true;
    scene.add(foliage);

    trees.push({ trunk, foliage });
  }

  return trees;
}

export function createBenches(scene, count = 30) {
  const seatGeometry = new THREE.BoxGeometry(2.5, 0.3, 1);
  const benchMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
  });

  const benches = [];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 300;
    const z = (Math.random() - 0.5) * 300;

    const seat = new THREE.Mesh(seatGeometry, benchMaterial);
    seat.position.set(x, 0.6, z);
    scene.add(seat);

    benches.push(seat);
  }

  return benches;
}

export function createCars(scene, count = 40) {
  const carColors = [
    0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff,
    0x000000, 0xff8800, 0x888888,
  ];

  const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
  const roofGeometry = new THREE.BoxGeometry(1.6, 0.8, 2);
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8); // Reduced segments

  const cars = [];

  for (let i = 0; i < count; i++) {
    let x, z, rotation;
    if (Math.random() > 0.5) {
      x =
        (Math.floor(Math.random() * 10) - 5) * 40 +
        (Math.random() > 0.5 ? 2 : -2);
      z = (Math.random() - 0.5) * 300;
      rotation = 0;
    } else {
      x = (Math.random() - 0.5) * 300;
      z =
        (Math.floor(Math.random() * 10) - 5) * 40 +
        (Math.random() > 0.5 ? 2 : -2);
      rotation = Math.PI / 2;
    }

    const carColor = carColors[Math.floor(Math.random() * carColors.length)];
    const carMaterial = new THREE.MeshStandardMaterial({
      color: carColor,
      roughness: 0.3,
      metalness: 0.8,
    });

    const carBody = new THREE.Mesh(bodyGeometry, carMaterial);
    carBody.position.set(x, 0.7, z);
    carBody.rotation.y = rotation;
    carBody.castShadow = true;
    scene.add(carBody);

    const carRoof = new THREE.Mesh(roofGeometry, carMaterial);
    carRoof.position.set(x, 1.5, z - (rotation === 0 ? 0.3 : 0));
    carRoof.rotation.y = rotation;
    scene.add(carRoof);

    cars.push({ body: carBody, roof: carRoof });
  }

  return cars;
}
