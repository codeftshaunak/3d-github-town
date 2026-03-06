import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGitHub } from "../context/GitHubContext";
import {
  generateBuildingPosition,
  generateBuildingGeometry,
  getBuildingColor,
} from "../utils/buildingUtils";
import SearchBar from "./SearchBar";
import UserInfoPanel from "./UserInfoPanel";

export default function GitHubTown() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const buildingsRef = useRef([]);
  const labelsRef = useRef([]);
  const selectedBuildingRef = useRef(null);
  const { users, setSelectedUser, loading } = useGitHub();
  const controls = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const mouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ yaw: -Math.PI / 4, pitch: -0.3 });
  const cameraVelocity = useRef({ x: 0, y: 0, z: 0 });
  const cameraDistance = useRef(50);
  const cameraTarget = useRef(null); // Target building to zoom to
  const isZoomingToBuilding = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 100, 400); // Atmospheric fog
    sceneRef.current = scene;
    console.log("Scene created");

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    camera.position.set(0, 30, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    console.log("Scene initialized, camera at:", camera.position);
    console.log("Camera looking at origin (0, 0, 0)");

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    console.log("Renderer initialized:", {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: renderer.getPixelRatio(),
    });

    // Lighting - more realistic sunlight
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    console.log("Ambient light added");

    // Main sunlight
    const mainLight = new THREE.DirectionalLight(0xfff8dc, 1.2);
    mainLight.position.set(50, 80, 40);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -100;
    mainLight.shadow.camera.right = 100;
    mainLight.shadow.camera.top = 100;
    mainLight.shadow.camera.bottom = -100;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    console.log("Directional light added");

    // Fill light (sky light)
    const fillLight1 = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6);
    scene.add(fillLight1);

    // Warm evening light
    const fillLight2 = new THREE.DirectionalLight(0xffaa66, 0.4);
    fillLight2.position.set(-50, 30, -50);
    scene.add(fillLight2);

    // Ground - more realistic city ground
    const groundGeometry = new THREE.PlaneGeometry(800, 800);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add city roads/grid
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Main roads
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      const roadGeometry = new THREE.PlaneGeometry(4, 800);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(i * 40, 0.02, 0);
      scene.add(road);

      const roadGeometry2 = new THREE.PlaneGeometry(800, 4);
      const road2 = new THREE.Mesh(roadGeometry2, roadMaterial);
      road2.rotation.x = -Math.PI / 2;
      road2.position.set(0, 0.02, i * 40);
      scene.add(road2);
    }

    // Grid helper (subtle)
    const gridHelper = new THREE.GridHelper(400, 80, 0x333333, 0x1a1a1a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Add realistic city elements

    // Street lights along roads
    const streetLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.8,
    });
    const lightBulbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffee99,
      emissive: 0xffee99,
      emissiveIntensity: 1.5,
    });

    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j++) {
        if (i === 0 || j === 0) continue; // Skip center

        // Place street lights at intersections and along roads
        if ((i % 1 === 0 && j % 1 === 0) || Math.random() > 0.7) {
          const x = i * 40 + (Math.random() - 0.5) * 10;
          const z = j * 40 + (Math.random() - 0.5) * 10;

          // Street light pole
          const poleGeometry = new THREE.CylinderGeometry(0.3, 0.4, 8, 8);
          const pole = new THREE.Mesh(poleGeometry, streetLightMaterial);
          pole.position.set(x, 4, z);
          pole.castShadow = true;
          scene.add(pole);

          // Light fixture
          const fixtureGeometry = new THREE.CylinderGeometry(0.8, 0.6, 1, 8);
          const fixture = new THREE.Mesh(fixtureGeometry, streetLightMaterial);
          fixture.position.set(x, 8.5, z);
          scene.add(fixture);

          // Light bulb (glowing)
          const bulbGeometry = new THREE.SphereGeometry(0.5, 16, 16);
          const bulb = new THREE.Mesh(bulbGeometry, lightBulbMaterial);
          bulb.position.set(x, 8, z);
          scene.add(bulb);

          // Point light from street light
          const pointLight = new THREE.PointLight(0xffee99, 0.8, 30);
          pointLight.position.set(x, 8, z);
          scene.add(pointLight);
        }
      }
    }

    // Trees scattered across the city
    const treeTrunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const treeFoliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.8,
    });

    for (let i = 0; i < 150; i++) {
      // Random position avoiding roads
      let x, z;
      do {
        x = (Math.random() - 0.5) * 350;
        z = (Math.random() - 0.5) * 350;
      } while (
        (Math.abs(x % 40) < 5 && Math.abs(z) < 350) || // Avoid vertical roads
        (Math.abs(z % 40) < 5 && Math.abs(x) < 350) // Avoid horizontal roads
      );

      // Tree trunk
      const trunkHeight = 3 + Math.random() * 2;
      const trunkGeometry = new THREE.CylinderGeometry(
        0.4,
        0.5,
        trunkHeight,
        8,
      );
      const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
      trunk.position.set(x, trunkHeight / 2, z);
      trunk.castShadow = true;
      scene.add(trunk);

      // Tree foliage (multiple spheres for realistic look)
      const foliageSize = 2 + Math.random() * 1.5;
      for (let f = 0; f < 3; f++) {
        const foliageGeometry = new THREE.SphereGeometry(foliageSize, 8, 8);
        const foliage = new THREE.Mesh(foliageGeometry, treeFoliageMaterial);
        foliage.position.set(
          x + (Math.random() - 0.5) * 1.5,
          trunkHeight + foliageSize + (Math.random() - 0.5) * 1,
          z + (Math.random() - 0.5) * 1.5,
        );
        foliage.castShadow = true;
        scene.add(foliage);
      }
    }

    // Benches near sidewalks
    const benchMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    });
    const benchMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.6,
      metalness: 0.7,
    });

    for (let i = 0; i < 60; i++) {
      let x = (Math.random() - 0.5) * 300;
      let z = (Math.random() - 0.5) * 300;

      // Bench seat
      const seatGeometry = new THREE.BoxGeometry(2.5, 0.3, 1);
      const seat = new THREE.Mesh(seatGeometry, benchMaterial);
      seat.position.set(x, 0.6, z);
      scene.add(seat);

      // Bench back
      const backGeometry = new THREE.BoxGeometry(2.5, 1.2, 0.2);
      const back = new THREE.Mesh(backGeometry, benchMaterial);
      back.position.set(x, 1.2, z - 0.4);
      scene.add(back);

      // Bench legs
      const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
      const positions = [
        [x - 1, 0.3, z - 0.4],
        [x + 1, 0.3, z - 0.4],
        [x - 1, 0.3, z + 0.4],
        [x + 1, 0.3, z + 0.4],
      ];
      positions.forEach(([px, py, pz]) => {
        const leg = new THREE.Mesh(legGeometry, benchMetalMaterial);
        leg.position.set(px, py, pz);
        scene.add(leg);
      });
    }

    // Parked cars along roads
    const carColors = [
      0xff0000, // Red
      0x0000ff, // Blue
      0x00ff00, // Green
      0xffff00, // Yellow
      0xff00ff, // Magenta
      0x00ffff, // Cyan
      0xffffff, // White
      0x000000, // Black
      0xff8800, // Orange
      0x888888, // Gray
    ];

    for (let i = 0; i < 80; i++) {
      // Random position along roads
      let x, z, rotation;
      if (Math.random() > 0.5) {
        // Along vertical roads
        x =
          (Math.floor(Math.random() * 10) - 5) * 40 +
          (Math.random() > 0.5 ? 2 : -2);
        z = (Math.random() - 0.5) * 300;
        rotation = 0;
      } else {
        // Along horizontal roads
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

      // Car body
      const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
      const carBody = new THREE.Mesh(bodyGeometry, carMaterial);
      carBody.position.set(x, 0.7, z);
      carBody.rotation.y = rotation;
      carBody.castShadow = true;
      scene.add(carBody);

      // Car roof
      const roofGeometry = new THREE.BoxGeometry(1.6, 0.8, 2);
      const carRoof = new THREE.Mesh(roofGeometry, carMaterial);
      carRoof.position.set(x, 1.5, z - (rotation === 0 ? 0.3 : 0));
      carRoof.rotation.y = rotation;
      scene.add(carRoof);

      // Wheels
      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
      });
      const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16);

      const wheelPositions =
        rotation === 0
          ? [
              [x - 0.8, 0.3, z - 1.2],
              [x + 0.8, 0.3, z - 1.2],
              [x - 0.8, 0.3, z + 1.2],
              [x + 0.8, 0.3, z + 1.2],
            ]
          : [
              [x - 1.2, 0.3, z - 0.8],
              [x - 1.2, 0.3, z + 0.8],
              [x + 1.2, 0.3, z - 0.8],
              [x + 1.2, 0.3, z + 0.8],
            ];

      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(wx, wy, wz);
        wheel.rotation.z = Math.PI / 2;
        if (rotation === Math.PI / 2) {
          wheel.rotation.x = Math.PI / 2;
          wheel.rotation.z = 0;
        }
        scene.add(wheel);
      });
    }

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(buildingsRef.current, true);

      if (intersects.length > 0) {
        let clickedBuilding = intersects[0].object;
        // Traverse up to find the building group
        while (clickedBuilding.parent && !clickedBuilding.userData.user) {
          clickedBuilding = clickedBuilding.parent;
        }
        if (clickedBuilding.userData.user) {
          // Close previously selected building
          if (
            selectedBuildingRef.current &&
            selectedBuildingRef.current !== clickedBuilding
          ) {
            selectedBuildingRef.current.userData.isOpen = false;
          }
          // Toggle current building
          clickedBuilding.userData.isOpen = !clickedBuilding.userData.isOpen;
          selectedBuildingRef.current = clickedBuilding;
          setSelectedUser(clickedBuilding.userData.user);

          // Set camera target to zoom to this building
          cameraTarget.current = clickedBuilding.position.clone();
          isZoomingToBuilding.current = true;
        }
      } else {
        // Close any open building when clicking empty space
        if (selectedBuildingRef.current) {
          selectedBuildingRef.current.userData.isOpen = false;
        }
        setSelectedUser(null);
        selectedBuildingRef.current = null;

        // Reset camera target
        cameraTarget.current = null;
        isZoomingToBuilding.current = false;
      }
    };

    window.addEventListener("click", onMouseClick);

    // Keyboard controls
    const onKeyDown = (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          setControls((c) => ({ ...c, forward: true }));
          break;
        case "s":
          setControls((c) => ({ ...c, backward: true }));
          break;
        case "a":
          setControls((c) => ({ ...c, left: true }));
          break;
        case "d":
          setControls((c) => ({ ...c, right: true }));
          break;
        case "z":
          // Zoom to last building in the list
          if (buildingsRef.current.length > 0) {
            const lastBuilding =
              buildingsRef.current[buildingsRef.current.length - 1];
            cameraTarget.current = lastBuilding.position.clone();
            isZoomingToBuilding.current = true;
            selectedBuildingRef.current = lastBuilding;
            lastBuilding.userData.isOpen = true;
            setSelectedUser(lastBuilding.userData.user);
          }
          break;
        case "escape":
          // Reset camera and deselect building
          cameraTarget.current = null;
          isZoomingToBuilding.current = false;
          if (selectedBuildingRef.current) {
            selectedBuildingRef.current.userData.isOpen = false;
            selectedBuildingRef.current = null;
          }
          setSelectedUser(null);
          break;
      }
    };
    const onKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          setControls((c) => ({ ...c, forward: false }));
          break;
        case "s":
          setControls((c) => ({ ...c, backward: false }));
          break;
        case "a":
          setControls((c) => ({ ...c, left: false }));
          break;
        case "d":
          setControls((c) => ({ ...c, right: false }));
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Mouse controls for camera rotation
    const onMouseDown = (e) => {
      if (e.button === 2 || e.button === 0) {
        // Right or left click
        mouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onMouseUp = () => {
      mouseDown.current = false;
    };
    const onMouseMove = (e) => {
      if (mouseDown.current) {
        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;
        cameraRotation.current.yaw -= deltaX * 0.005;
        cameraRotation.current.pitch = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, cameraRotation.current.pitch - deltaY * 0.005),
        );
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Mouse wheel zoom
    const onWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 2;
      cameraDistance.current = Math.max(
        10,
        Math.min(150, cameraDistance.current + e.deltaY * 0.05 * zoomSpeed),
      );
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onWindowResize);

    // Animation loop
    let animationId;
    let time = 0;
    let frameCount = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.01;
      frameCount++;

      // Log every 60 frames (about once per second)
      if (frameCount % 60 === 0) {
        console.log(
          "Animation frame",
          frameCount,
          "camera pos:",
          camera.position,
          "buildings:",
          buildingsRef.current.length,
        );
      }

      // Camera movement based on controls
      const moveSpeed = 0.5;
      const direction = new THREE.Vector3();

      if (controls.current.forward) direction.z -= 1;
      if (controls.current.backward) direction.z += 1;
      if (controls.current.left) direction.x -= 1;
      if (controls.current.right) direction.x += 1;

      if (direction.length() > 0) {
        direction.normalize();
        // Apply rotation to movement direction
        const rotatedDirection = direction.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          cameraRotation.current.yaw,
        );
        cameraVelocity.current.x = rotatedDirection.x * moveSpeed;
        cameraVelocity.current.z = rotatedDirection.z * moveSpeed;
      } else {
        cameraVelocity.current.x *= 0.9;
        cameraVelocity.current.z *= 0.9;
      }

      // Smooth camera zoom to building or normal movement
      if (isZoomingToBuilding.current && cameraTarget.current) {
        // Calculate target camera position (offset from building)
        const targetPos = new THREE.Vector3(
          cameraTarget.current.x,
          cameraTarget.current.y + 15,
          cameraTarget.current.z + 25,
        );

        // Smooth lerp to target
        camera.position.lerp(targetPos, 0.05);

        // Look at the building
        const lookAtTarget = new THREE.Vector3(
          cameraTarget.current.x,
          cameraTarget.current.y + 10,
          cameraTarget.current.z,
        );
        camera.lookAt(lookAtTarget);

        // Stop zooming when close enough
        if (camera.position.distanceTo(targetPos) < 1) {
          isZoomingToBuilding.current = false;
        }
      } else {
        // Normal camera movement
        camera.position.x += cameraVelocity.current.x;
        camera.position.z += cameraVelocity.current.z;

        // Apply zoom by adjusting camera height based on distance
        camera.position.y = cameraDistance.current * 0.6;
      }

      // Apply camera rotation (only if not zooming to building)
      if (!isZoomingToBuilding.current) {
        if (frameCount < 120) {
          // For first 2 seconds, keep camera fixed looking at origin
          camera.lookAt(0, 5, 0);
        } else {
          // After that, apply manual rotation
          const lookTarget = new THREE.Vector3(
            camera.position.x +
              Math.sin(cameraRotation.current.yaw) *
                Math.cos(cameraRotation.current.pitch),
            camera.position.y + Math.sin(cameraRotation.current.pitch),
            camera.position.z +
              Math.cos(cameraRotation.current.yaw) *
                Math.cos(cameraRotation.current.pitch),
          );
          camera.lookAt(lookTarget);
        }
      }

      // Animate buildings
      buildingsRef.current.forEach((building, index) => {
        if (building.userData.emissiveMaterial) {
          const pulse = Math.sin(time * 2 + index * 0.5) * 0.3 + 0.7;
          building.userData.emissiveMaterial.emissiveIntensity = pulse * 0.3;
        }

        // Animate selected building (open/close)
        if (building.userData.isOpen) {
          building.rotation.y += 0.01;
          building.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.1);
          if (building.userData.door) {
            building.userData.door.rotation.y = Math.min(
              building.userData.door.rotation.y + 0.05,
              Math.PI / 2,
            );
          }
        } else {
          building.rotation.y *= 0.95;
          building.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
          if (building.userData.door) {
            building.userData.door.rotation.y = Math.max(
              building.userData.door.rotation.y - 0.05,
              0,
            );
          }
        }
      });

      // Update label positions to face camera
      labelsRef.current.forEach((label) => {
        label.lookAt(camera.position);
      });

      if (frameCount === 1) {
        console.log("FIRST RENDER - Scene children:", scene.children.length);
        console.log(
          "Canvas size:",
          renderer.domElement.width,
          "x",
          renderer.domElement.height,
        );
        console.log("Camera position:", camera.position);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("click", onMouseClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onWindowResize);
      renderer.dispose();
    };
  }, [setSelectedUser]);

  // Update buildings when users change
  useEffect(() => {
    if (!sceneRef.current) {
      console.log("Scene not ready yet");
      return;
    }

    console.log("Building update triggered, users:", users.length);

    // If no users loaded, create test buildings to verify rendering works
    if (users.length === 0) {
      console.log("No users yet, will wait for them to load...");
      return;
    }

    // Remove old buildings and labels
    buildingsRef.current.forEach((building) => {
      sceneRef.current.remove(building);
    });
    buildingsRef.current = [];
    labelsRef.current = [];

    // Create new buildings
    users.forEach((user, index) => {
      console.log(`Creating building ${index} for user: ${user.login}`);
      const position = generateBuildingPosition(index, users.length);
      const geometry = generateBuildingGeometry(user);
      const colors = getBuildingColor(user);

      console.log(
        `  Position: (${position.x.toFixed(2)}, 0, ${position.z.toFixed(2)})`,
      );
      console.log(
        `  Geometry: ${geometry.width.toFixed(1)}x${geometry.height.toFixed(1)}x${geometry.depth.toFixed(1)}`,
      );
      console.log(`  Color: 0x${colors.main.toString(16)}`);

      // Building group
      const buildingGroup = new THREE.Group();
      buildingGroup.position.set(position.x, 0, position.z);
      buildingGroup.userData.user = user;
      buildingGroup.userData.isOpen = false;

      // Determine building style based on index (variety)
      const buildingType = index % 4; // 0: modern glass, 1: office, 2: residential, 3: classic

      // Realistic building colors (GTA5 style)
      const buildingColors = [
        { main: 0x2a3f5f, accent: 0x4a9eff, glass: 0x88ccff }, // Modern blue glass
        { main: 0x3a3a3a, accent: 0xffa500, glass: 0xffffaa }, // Dark office
        { main: 0x8b7355, accent: 0xd4af37, glass: 0xffeeaa }, // Residential beige
        { main: 0x4a5568, accent: 0xe53e3e, glass: 0xaaddff }, // Classic gray
      ];

      const typeColors = buildingColors[buildingType];

      // Main building body with more realistic proportions
      const buildingGeometry = new THREE.BoxGeometry(
        geometry.width,
        geometry.height,
        geometry.depth,
      );

      // More realistic concrete/modern material
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: typeColors.main,
        roughness: buildingType === 0 ? 0.2 : 0.8, // Glass buildings are smoother
        metalness: buildingType === 0 ? 0.7 : 0.3,
        envMapIntensity: 1.5,
      });

      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.y = geometry.height / 2;
      building.castShadow = true;
      building.receiveShadow = true;
      buildingGroup.add(building);

      // Add architectural details based on type
      if (buildingType === 0) {
        // Modern glass building - add glass facade panels
        const glassMaterial = new THREE.MeshPhysicalMaterial({
          color: typeColors.glass,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.4,
          transmission: 0.5,
          thickness: 0.5,
        });

        // Glass panels on all sides
        const panelGeometry = new THREE.BoxGeometry(
          geometry.width * 1.01,
          geometry.height,
          0.1,
        );

        const frontPanel = new THREE.Mesh(panelGeometry, glassMaterial);
        frontPanel.position.set(
          0,
          geometry.height / 2,
          geometry.depth / 2 + 0.05,
        );
        buildingGroup.add(frontPanel);

        const backPanel = new THREE.Mesh(panelGeometry, glassMaterial);
        backPanel.position.set(
          0,
          geometry.height / 2,
          -geometry.depth / 2 - 0.05,
        );
        buildingGroup.add(backPanel);

        const sideGeometry = new THREE.BoxGeometry(
          0.1,
          geometry.height,
          geometry.depth * 1.01,
        );

        const leftPanel = new THREE.Mesh(sideGeometry, glassMaterial);
        leftPanel.position.set(
          -geometry.width / 2 - 0.05,
          geometry.height / 2,
          0,
        );
        buildingGroup.add(leftPanel);

        const rightPanel = new THREE.Mesh(sideGeometry, glassMaterial);
        rightPanel.position.set(
          geometry.width / 2 + 0.05,
          geometry.height / 2,
          0,
        );
        buildingGroup.add(rightPanel);

        // Add antenna on top
        const antennaGeometry = new THREE.CylinderGeometry(
          0.1,
          0.1,
          geometry.height * 0.3,
          8,
        );
        const antennaMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.8,
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.y = geometry.height + geometry.height * 0.15;
        buildingGroup.add(antenna);
      } else if (buildingType === 1) {
        // Office building - add horizontal ledges
        const ledgeMaterial = new THREE.MeshStandardMaterial({
          color: typeColors.accent,
          roughness: 0.7,
          metalness: 0.4,
        });

        const floorsCount = Math.floor(geometry.height / 3);
        for (let f = 1; f < floorsCount; f++) {
          const ledgeGeometry = new THREE.BoxGeometry(
            geometry.width * 1.05,
            0.3,
            geometry.depth * 1.05,
          );
          const ledge = new THREE.Mesh(ledgeGeometry, ledgeMaterial);
          ledge.position.y = (f * geometry.height) / floorsCount;
          buildingGroup.add(ledge);
        }

        // Flat roof with edge
        const roofGeometry = new THREE.BoxGeometry(
          geometry.width * 1.1,
          0.5,
          geometry.depth * 1.1,
        );
        const roof = new THREE.Mesh(roofGeometry, ledgeMaterial);
        roof.position.y = geometry.height + 0.25;
        buildingGroup.add(roof);
      } else if (buildingType === 2) {
        // Residential - add balconies
        const balconyMaterial = new THREE.MeshStandardMaterial({
          color: typeColors.accent,
          roughness: 0.8,
          metalness: 0.2,
        });

        const floors = Math.floor(geometry.height / 3);
        for (let floor = 1; floor < floors; floor++) {
          const balconyGeometry = new THREE.BoxGeometry(
            geometry.width * 0.9,
            0.2,
            1.5,
          );
          const balcony = new THREE.Mesh(balconyGeometry, balconyMaterial);
          balcony.position.set(
            0,
            (floor * geometry.height) / floors,
            geometry.depth / 2 + 0.75,
          );
          buildingGroup.add(balcony);

          // Balcony railing
          const railGeometry = new THREE.BoxGeometry(
            geometry.width * 0.9,
            1,
            0.1,
          );
          const rail = new THREE.Mesh(railGeometry, balconyMaterial);
          rail.position.set(
            0,
            (floor * geometry.height) / floors + 0.5,
            geometry.depth / 2 + 1.5,
          );
          buildingGroup.add(rail);
        }

        // Residential roof - sloped
        const roofGeometry = new THREE.ConeGeometry(
          geometry.width * 0.8,
          geometry.height * 0.15,
          4,
        );
        const roofMaterial = new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          roughness: 0.9,
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = geometry.height + geometry.height * 0.075;
        roof.rotation.y = Math.PI / 4;
        buildingGroup.add(roof);
      } else {
        // Classic building - add columns
        const columnMaterial = new THREE.MeshStandardMaterial({
          color: typeColors.accent,
          roughness: 0.9,
          metalness: 0.1,
        });

        const columnRadius = geometry.width * 0.08;
        const columnGeometry = new THREE.CylinderGeometry(
          columnRadius,
          columnRadius,
          geometry.height,
          12,
        );

        // 4 columns at corners
        const positions = [
          [-geometry.width * 0.4, 0, geometry.depth * 0.4],
          [geometry.width * 0.4, 0, geometry.depth * 0.4],
          [-geometry.width * 0.4, 0, -geometry.depth * 0.4],
          [geometry.width * 0.4, 0, -geometry.depth * 0.4],
        ];

        positions.forEach(([x, y, z]) => {
          const column = new THREE.Mesh(columnGeometry, columnMaterial);
          column.position.set(x, geometry.height / 2, z);
          buildingGroup.add(column);
        });

        // Classic roof - dome
        const domeGeometry = new THREE.SphereGeometry(
          geometry.width * 0.5,
          16,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        );
        const domeMaterial = new THREE.MeshStandardMaterial({
          color: typeColors.accent,
          roughness: 0.3,
          metalness: 0.7,
        });
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.position.y = geometry.height;
        buildingGroup.add(dome);
      }

      // Windows for all building types
      const floors = Math.floor(geometry.height / 3);
      const windowsPerFloor = buildingType === 0 ? 5 : 3; // More windows for glass buildings
      const windowSize = buildingType === 0 ? 0.6 : 0.4;
      const windowDepth = 0.15;

      const windowMaterial = new THREE.MeshStandardMaterial({
        color: typeColors.glass,
        emissive: typeColors.glass,
        emissiveIntensity: buildingType === 0 ? 0.6 : 0.4,
        metalness: 0.9,
        roughness: 0.1,
      });

      // Front and back windows
      for (let floor = 0; floor < floors; floor++) {
        for (let win = 0; win < windowsPerFloor; win++) {
          const windowGeo = new THREE.BoxGeometry(
            windowSize * 0.8,
            windowSize * 1.5,
            windowDepth,
          );

          // Front windows
          const frontWindow = new THREE.Mesh(windowGeo, windowMaterial);
          const xPos =
            (win - (windowsPerFloor - 1) / 2) *
            (geometry.width / (windowsPerFloor + 0.5));
          const yPos = (floor + 0.5) * (geometry.height / floors);
          frontWindow.position.set(
            xPos,
            yPos,
            geometry.depth / 2 + windowDepth / 2,
          );
          buildingGroup.add(frontWindow);

          // Back windows
          const backWindow = new THREE.Mesh(windowGeo, windowMaterial);
          backWindow.position.set(
            xPos,
            yPos,
            -geometry.depth / 2 - windowDepth / 2,
          );
          buildingGroup.add(backWindow);
        }
      }

      // Side windows
      const sideWindows = buildingType === 0 ? 3 : 2;
      for (let floor = 0; floor < floors; floor++) {
        for (let win = 0; win < sideWindows; win++) {
          const windowGeo = new THREE.BoxGeometry(
            windowDepth,
            windowSize * 1.5,
            windowSize * 0.8,
          );
          const zPos =
            (win - (sideWindows - 1) / 2) *
            (geometry.depth / (sideWindows + 0.5));
          const yPos = (floor + 0.5) * (geometry.height / floors);

          // Left side
          const leftWindow = new THREE.Mesh(windowGeo, windowMaterial);
          leftWindow.position.set(
            -geometry.width / 2 - windowDepth / 2,
            yPos,
            zPos,
          );
          buildingGroup.add(leftWindow);

          // Right side
          const rightWindow = new THREE.Mesh(windowGeo, windowMaterial);
          rightWindow.position.set(
            geometry.width / 2 + windowDepth / 2,
            yPos,
            zPos,
          );
          buildingGroup.add(rightWindow);
        }
      }

      // Main entrance door (more prominent)
      const doorGeometry = new THREE.BoxGeometry(
        geometry.width * 0.4,
        geometry.height * 0.2,
        0.3,
      );
      const doorMaterial = new THREE.MeshStandardMaterial({
        color: buildingType === 0 ? 0x111111 : 0x654321,
        roughness: buildingType === 0 ? 0.3 : 0.9,
        metalness: buildingType === 0 ? 0.8 : 0.1,
      });
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      door.position.set(0, geometry.height * 0.1, geometry.depth / 2 + 0.15);
      buildingGroup.add(door);
      buildingGroup.userData.door = door;

      // Entrance canopy
      const canopyGeometry = new THREE.BoxGeometry(
        geometry.width * 0.6,
        0.2,
        2,
      );
      const canopyMaterial = new THREE.MeshStandardMaterial({
        color: typeColors.accent,
        roughness: 0.7,
        metalness: 0.3,
      });
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
      canopy.position.set(0, geometry.height * 0.22, geometry.depth / 2 + 1);
      buildingGroup.add(canopy);

      // Base platform (sidewalk)
      const baseGeometry = new THREE.BoxGeometry(
        geometry.width * 1.3,
        0.3,
        geometry.depth * 1.3,
      );
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.1,
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.15;
      buildingGroup.add(base);

      // Create username label on top of building using canvas texture
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 512;
      canvas.height = 128;

      context.fillStyle = "rgba(0, 0, 0, 0.7)";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = "bold 48px Arial";
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(user.login, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const label = new THREE.Sprite(labelMaterial);
      label.position.set(0, geometry.height + 2, 0);
      label.scale.set(8, 2, 1);
      buildingGroup.add(label);
      labelsRef.current.push(label);

      buildingsRef.current.push(buildingGroup);
      sceneRef.current.add(buildingGroup);
    });

    console.log(
      `Created ${buildingsRef.current.length} buildings in the scene`,
    );
  }, [users]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", touchAction: "none" }}
      />
      <SearchBar />
      <UserInfoPanel />

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 drop-shadow-lg">
          3D GitHub Town
        </h1>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-slate-900/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-300 text-xl">Loading GitHub Town...</p>
            <p className="text-slate-400 text-sm mt-2">
              Fetching {users.length} buildings
            </p>
          </div>
        </div>
      )}

      {/* Controls guide */}
      <div className="absolute bottom-8 left-8 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
        <h3 className="text-cyan-400 font-bold mb-2">Controls</h3>
        <div className="text-slate-300 text-sm space-y-1">
          <p>
            <span className="text-cyan-400 font-mono">WASD</span> - Move around
          </p>
          <p>
            <span className="text-cyan-400 font-mono">Mouse Drag</span> - Look
            around
          </p>
          <p>
            <span className="text-cyan-400 font-mono">Scroll</span> - Zoom
            in/out
          </p>
          <p>
            <span className="text-cyan-400 font-mono">Click</span> - Select &
            zoom to building
          </p>
          <p>
            <span className="text-cyan-400 font-mono">Z</span> - Zoom to last
            building
          </p>
          <p>
            <span className="text-cyan-400 font-mono">ESC</span> - Reset view
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-8 right-8 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
        <div className="text-slate-300 text-sm">
          <p className="text-cyan-400 font-bold mb-2">City Stats</p>
          <p>
            <span className="text-slate-400">Buildings:</span>{" "}
            <span className="text-white font-bold">{users.length}</span>
          </p>
          <p>
            <span className="text-slate-400">Street Lights:</span>{" "}
            <span className="text-white font-bold">~100</span>
          </p>
          <p>
            <span className="text-slate-400">Trees:</span>{" "}
            <span className="text-white font-bold">150</span>
          </p>
          <p>
            <span className="text-slate-400">Benches:</span>{" "}
            <span className="text-white font-bold">60</span>
          </p>
          <p>
            <span className="text-slate-400">Cars:</span>{" "}
            <span className="text-white font-bold">80</span>
          </p>
        </div>
      </div>
    </div>
  );
}
