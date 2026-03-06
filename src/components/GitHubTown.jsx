import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGitHub } from "../context/GitHubContext";
import {
  generateBuildingPosition,
  generateBuildingGeometry,
  getBuildingColor,
} from "../utils/buildingUtils";
import {
  createStreetLights,
  createTrees,
  createBenches,
  createCars,
} from "../utils/cityElements";
import SearchBar from "./SearchBar";

export default function GitHubTown() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const buildingsRef = useRef([]);
  const labelsRef = useRef([]);
  const selectedBuildingRef = useRef(null);
  const { users, setSelectedUser, loading, newlyAddedUser, setNewlyAddedUser } =
    useGitHub();
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
  const isWaitingAtDoor = useRef(false); // Camera locked at door, waiting for user
  const isViewingBuilding = useRef(false); // Camera locked while viewing building info
  const lockedCameraPosition = useRef(null); // Locked camera position when waiting
  const doorButtonRef = useRef(null); // 3D button sprite on the door
  const showEnterPromptRef = useRef(false); // Ref for animation loop to access current value
  const [showEnterPrompt, setShowEnterPrompt] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const activatedInfoSpritesRef = useRef([]); // 3D sprites showing user info on building

  // Sync ref with state for animation loop access
  useEffect(() => {
    showEnterPromptRef.current = showEnterPrompt;
  }, [showEnterPrompt]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Check for WebGL support
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.error("WebGL is not supported in this browser/environment");
      setWebglError(true);
      return;
    }

    let scene, camera, renderer;

    try {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a15); // Dark night sky
      scene.fog = new THREE.Fog(0x0a0a15, 100, 400); // Dark atmospheric fog
      sceneRef.current = scene;
      console.log("Scene created");

      // Camera setup
      camera = new THREE.PerspectiveCamera(
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

      // Renderer setup with error handling
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
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
    } catch (error) {
      console.error("Error initializing WebGL renderer:", error);
      setWebglError(true);
      return;
    }

    // Lighting - moonlight and city lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);
    console.log("Ambient light added");

    // Main moonlight
    const mainLight = new THREE.DirectionalLight(0xaaccff, 0.8);
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

    // Fill light (night sky light)
    const fillLight1 = new THREE.HemisphereLight(0x1a1a2e, 0x0a0a15, 0.4);
    scene.add(fillLight1);

    // Warm city light glow
    const fillLight2 = new THREE.DirectionalLight(0xff9966, 0.3);
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

    // Add realistic city elements using optimized utility functions
    createStreetLights(scene);
    createTrees(scene);
    createBenches(scene);
    createCars(scene);

    // Create 3D door enter button sprite
    const createDoorButton = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 512;
      canvas.height = 256;

      // Glow effect
      context.shadowColor = "#00ffff";
      context.shadowBlur = 30;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;

      // Gradient background
      const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(0.5, "#06b6d4");
      gradient.addColorStop(1, "#3b82f6");
      context.fillStyle = gradient;
      context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 20);
      context.fill();

      // Border with glow
      context.strokeStyle = "#ffffff";
      context.lineWidth = 6;
      context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 20);
      context.stroke();

      // Reset shadow for text
      context.shadowBlur = 10;

      // Text
      context.font = "bold 60px Arial";
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("🚪 ENTER", canvas.width / 2, canvas.height / 2 - 10);

      context.font = "bold 28px Arial";
      context.fillText("Click Here", canvas.width / 2, canvas.height / 2 + 45);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(8, 4, 1); // Larger button
      sprite.visible = false;
      sprite.userData.isDoorButton = true; // Mark it as clickable
      scene.add(sprite);
      doorButtonRef.current = sprite;
    };

    createDoorButton();

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check if door button was clicked
      if (doorButtonRef.current && doorButtonRef.current.visible) {
        console.log("🔍 Checking door button for click...");
        const buttonIntersects = raycaster.intersectObject(
          doorButtonRef.current,
        );
        if (buttonIntersects.length > 0) {
          console.log(
            "✅ Door button clicked! Intersections:",
            buttonIntersects.length,
          );
          // Door button clicked - enter building
          handleEnterBuilding();
          return;
        } else {
          console.log("❌ No button intersection");
        }
      }

      // Check for building click
      const intersects = raycaster.intersectObjects(buildingsRef.current, true);

      if (intersects.length > 0) {
        let clickedBuilding = intersects[0].object;
        // Traverse up to find the building group
        while (clickedBuilding.parent && !clickedBuilding.userData.user) {
          clickedBuilding = clickedBuilding.parent;
        }
        if (clickedBuilding.userData.user) {
          // First click - show enter prompt
          if (
            !showEnterPrompt ||
            selectedBuildingRef.current !== clickedBuilding
          ) {
            // Close previously selected building
            if (
              selectedBuildingRef.current &&
              selectedBuildingRef.current !== clickedBuilding
            ) {
              selectedBuildingRef.current.userData.isOpen = false;
            }

            selectedBuildingRef.current = clickedBuilding;
            setSelectedUser(clickedBuilding.userData.user);
            setShowEnterPrompt(false);

            // Zoom to building entrance
            cameraTarget.current = clickedBuilding.position.clone();
            isZoomingToBuilding.current = true;
            isWaitingAtDoor.current = false;
            isViewingBuilding.current = false;
          }
        }
      } else {
        // Close any open building when clicking empty space
        setShowEnterPrompt(false);
        handleCloseProfile();
        setSelectedUser(null);
        selectedBuildingRef.current = null;

        // Reset camera target
        cameraTarget.current = null;
        isZoomingToBuilding.current = false;
        isWaitingAtDoor.current = false;
        isViewingBuilding.current = false;
        lockedCameraPosition.current = null;
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
          // Close/deactivate building and reset camera
          handleCloseProfile();
          setShowEnterPrompt(false);
          cameraTarget.current = null;
          isZoomingToBuilding.current = false;
          isWaitingAtDoor.current = false;
          isViewingBuilding.current = false;
          lockedCameraPosition.current = null;
          if (selectedBuildingRef.current) {
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

      // Smooth camera zoom to building
      if (isZoomingToBuilding.current && cameraTarget.current) {
        // Zoom to building external view
        const targetPos = new THREE.Vector3(
          cameraTarget.current.x,
          cameraTarget.current.y + 15,
          cameraTarget.current.z + 25,
        );

        camera.position.lerp(targetPos, 0.05);

        const lookAtTarget = new THREE.Vector3(
          cameraTarget.current.x,
          cameraTarget.current.y + 10,
          cameraTarget.current.z,
        );
        camera.lookAt(lookAtTarget);

        if (camera.position.distanceTo(targetPos) < 1) {
          if (!isWaitingAtDoor.current) {
            console.log("✓ External zoom complete!");
            isZoomingToBuilding.current = false;
            // Show enter button after zoom completes and lock camera
            if (selectedBuildingRef.current && !showEnterPromptRef.current) {
              console.log("🎯 Showing enter button and locking camera");
              setShowEnterPrompt(true);
              isWaitingAtDoor.current = true;
              lockedCameraPosition.current = targetPos.clone(); // Lock camera at this position
            }
          }
        }
      } else if (
        (isWaitingAtDoor.current || isViewingBuilding.current) &&
        lockedCameraPosition.current &&
        selectedBuildingRef.current
      ) {
        // Keep camera locked at external view while waiting for button click or viewing building
        if (frameCount % 180 === 0 && isWaitingAtDoor.current) {
          console.log("🔒 Camera locked, waiting for button click");
        }
        camera.position.copy(lockedCameraPosition.current);
        const lookAtTarget = new THREE.Vector3(
          selectedBuildingRef.current.position.x,
          selectedBuildingRef.current.position.y + 10,
          selectedBuildingRef.current.position.z,
        );
        camera.lookAt(lookAtTarget);
      } else {
        // Normal camera movement
        camera.position.x += cameraVelocity.current.x;
        camera.position.z += cameraVelocity.current.z;

        // Apply zoom by adjusting camera height based on distance
        camera.position.y = cameraDistance.current * 0.6;
      }

      // Apply camera rotation (only if not zooming to building and not waiting at door)
      if (
        !isZoomingToBuilding.current &&
        !isWaitingAtDoor.current &&
        !isViewingBuilding.current
      ) {
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
        // Light up effect for activated buildings
        const isActivated = building.userData.isActivated;

        if (building.userData.emissiveMaterial) {
          if (isActivated) {
            // Bright, intense glow when activated
            const pulse = Math.sin(time * 3) * 0.2 + 0.8;
            building.userData.emissiveMaterial.emissiveIntensity = pulse * 2.5;
          } else {
            // Normal subtle pulse
            const pulse = Math.sin(time * 2 + index * 0.5) * 0.3 + 0.7;
            building.userData.emissiveMaterial.emissiveIntensity = pulse * 0.1;
          }
        }

        // Increase intensity of all windows when activated, reset when not
        building.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive) {
            if (isActivated) {
              const pulse = Math.sin(time * 3) * 0.3 + 1.2;
              child.material.emissiveIntensity = pulse * 1.0; // Bright windows
            } else {
              // Reset to original subtle glow
              if (!child.userData.originalEmissiveIntensity) {
                child.userData.originalEmissiveIntensity =
                  child.material.emissiveIntensity;
              }
              child.material.emissiveIntensity =
                child.userData.originalEmissiveIntensity || 0.4;
            }
          }
        });

        // Animate info sprites with subtle floating and pulsing effects
        if (isActivated && activatedInfoSpritesRef.current.length > 0) {
          activatedInfoSpritesRef.current.forEach((sprite, idx) => {
            // Subtle floating animation with phase offset
            const floatOffset = Math.sin(time * 1.5 + idx * 0.5) * 0.08;
            if (!sprite.userData.originalY) {
              sprite.userData.originalY = sprite.position.y;
            }
            sprite.position.y = sprite.userData.originalY + floatOffset;

            // Subtle scale pulse for depth
            const scalePulse = Math.sin(time * 2 + idx * 0.3) * 0.03 + 1;
            sprite.scale.x =
              (sprite.userData.originalScaleX || sprite.scale.x) * scalePulse;
            sprite.scale.y =
              (sprite.userData.originalScaleY || sprite.scale.y) * scalePulse;

            // Store original scale
            if (!sprite.userData.originalScaleX) {
              sprite.userData.originalScaleX = sprite.scale.x / scalePulse;
              sprite.userData.originalScaleY = sprite.scale.y / scalePulse;
            }
          });
        }

        // Float animation for selected building
        const isSelected = selectedBuildingRef.current === building;
        const targetY = isSelected ? 5 : 0; // Float 5 units up when selected
        const currentY = building.position.y;

        // Smooth transition to target Y position
        building.position.y += (targetY - currentY) * 0.05;

        // Fade out non-selected buildings when one is selected
        if (selectedBuildingRef.current) {
          const targetOpacity = isSelected ? 1 : 0.2;

          // Apply opacity to all meshes in the building group
          building.traverse((child) => {
            if (child.isMesh && child.material) {
              if (!child.material.transparent) {
                child.material.transparent = true;
              }
              const currentOpacity =
                child.material.opacity !== undefined
                  ? child.material.opacity
                  : 1;
              child.material.opacity += (targetOpacity - currentOpacity) * 0.05;
            }
          });
        } else {
          // Reset opacity when no building is selected
          building.traverse((child) => {
            if (child.isMesh && child.material) {
              const currentOpacity =
                child.material.opacity !== undefined
                  ? child.material.opacity
                  : 1;
              child.material.opacity += (1 - currentOpacity) * 0.05;
            }
          });
        }

        // Animate selected building (door opening animation)
        if (building.userData.isOpen) {
          // Don't rotate/scale the building when entering, just open the door
          if (building.userData.door) {
            building.userData.door.rotation.y = Math.min(
              building.userData.door.rotation.y + 0.08,
              Math.PI / 1.5, // Open wider for entering
            );
          }
        } else {
          if (building.userData.door) {
            building.userData.door.rotation.y = Math.max(
              building.userData.door.rotation.y - 0.08,
              0,
            );
          }
        }
      });

      // Update label positions to face camera
      labelsRef.current.forEach((label) => {
        label.lookAt(camera.position);
      });

      // Update door button position
      if (
        doorButtonRef.current &&
        selectedBuildingRef.current &&
        showEnterPromptRef.current
      ) {
        const building = selectedBuildingRef.current;
        const doorHeight = building.userData.geometry.height / 2;
        // Position button centered on the door, slightly in front
        doorButtonRef.current.position.set(
          building.position.x,
          building.position.y + doorHeight / 2 + 1,
          building.position.z + building.userData.geometry.depth / 2 + 2,
        );
        doorButtonRef.current.lookAt(camera.position);

        const wasVisible = doorButtonRef.current.visible;
        doorButtonRef.current.visible = true;

        // Log when button becomes visible
        if (!wasVisible && doorButtonRef.current.visible) {
          console.log(
            "🟢 DOOR BUTTON IS NOW VISIBLE at position:",
            doorButtonRef.current.position,
          );
          console.log("Button scale:", doorButtonRef.current.scale);
          console.log("Button material:", doorButtonRef.current.material);
        }

        // Pulse animation for visibility
        const pulseScale = 1 + Math.sin(frameCount * 0.05) * 0.1;
        doorButtonRef.current.scale.set(8 * pulseScale, 4 * pulseScale, 1);
      } else if (doorButtonRef.current) {
        doorButtonRef.current.visible = false;
        if (frameCount % 120 === 0 && showEnterPromptRef.current) {
          console.log("⚠️ Button should be visible but conditions not met:", {
            hasButtonRef: !!doorButtonRef.current,
            hasBuilding: !!selectedBuildingRef.current,
            showEnterPrompt: showEnterPromptRef.current,
          });
        }
      }

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
      buildingGroup.userData.isActivated = false;
      buildingGroup.userData.geometry = geometry; // Store for info display

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

      // More realistic concrete/modern material with emissive for light-up effect
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: typeColors.main,
        roughness: buildingType === 0 ? 0.2 : 0.8, // Glass buildings are smoother
        metalness: buildingType === 0 ? 0.7 : 0.3,
        envMapIntensity: 1.5,
        emissive: 0xffaa00, // Bright orange glow
        emissiveIntensity: 0.05, // Start very subtle
      });

      // Store material reference for animation
      buildingGroup.userData.emissiveMaterial = buildingMaterial;

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

        // Residential roof - sloped with detailed shingles
        const roofHeight = geometry.height * 0.25;
        const roofGeometry = new THREE.ConeGeometry(
          geometry.width * 0.85,
          roofHeight,
          4,
        );
        const roofMaterial = new THREE.MeshStandardMaterial({
          color: 0x3a2520,
          roughness: 0.95,
          metalness: 0.05,
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = geometry.height + roofHeight / 2;
        roof.rotation.y = Math.PI / 4;
        buildingGroup.add(roof);

        // Chimney for residential buildings
        const chimneyGeometry = new THREE.BoxGeometry(
          0.8,
          geometry.height * 0.3,
          0.8,
        );
        const chimneyMaterial = new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          roughness: 0.9,
        });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(
          geometry.width * 0.3,
          geometry.height + geometry.height * 0.15,
          -geometry.depth * 0.25,
        );
        buildingGroup.add(chimney);

        // Chimney cap
        const capGeometry = new THREE.BoxGeometry(1, 0.3, 1);
        const cap = new THREE.Mesh(capGeometry, chimneyMaterial);
        cap.position.set(
          geometry.width * 0.3,
          geometry.height + geometry.height * 0.3,
          -geometry.depth * 0.25,
        );
        buildingGroup.add(cap);
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

      // Windows for all building types with frames
      const floors = Math.floor(geometry.height / 3);
      const windowsPerFloor = buildingType === 0 ? 5 : 3; // More windows for glass buildings
      const windowSize = buildingType === 0 ? 0.6 : 0.5;
      const windowDepth = 0.15;

      const windowMaterial = new THREE.MeshStandardMaterial({
        color: typeColors.glass,
        emissive: typeColors.glass,
        emissiveIntensity: buildingType === 0 ? 0.6 : 0.4,
        metalness: 0.9,
        roughness: 0.1,
      });

      // Window frame material
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: buildingType === 2 ? 0xffffff : 0x222222,
        roughness: 0.8,
        metalness: 0.2,
      });

      // Front and back windows with frames
      for (let floor = 0; floor < floors; floor++) {
        for (let win = 0; win < windowsPerFloor; win++) {
          const windowGeo = new THREE.BoxGeometry(
            windowSize * 0.8,
            windowSize * 1.5,
            windowDepth,
          );

          // Window frame
          const frameGeo = new THREE.BoxGeometry(
            windowSize * 0.9,
            windowSize * 1.6,
            windowDepth + 0.05,
          );

          // Front windows
          const xPos =
            (win - (windowsPerFloor - 1) / 2) *
            (geometry.width / (windowsPerFloor + 0.5));
          const yPos = (floor + 0.5) * (geometry.height / floors);

          const frontFrame = new THREE.Mesh(frameGeo, frameMaterial);
          frontFrame.position.set(
            xPos,
            yPos,
            geometry.depth / 2 + windowDepth / 2 - 0.02,
          );
          buildingGroup.add(frontFrame);

          const frontWindow = new THREE.Mesh(windowGeo, windowMaterial);
          frontWindow.position.set(
            xPos,
            yPos,
            geometry.depth / 2 + windowDepth / 2,
          );
          buildingGroup.add(frontWindow);

          // Back windows
          const backFrame = new THREE.Mesh(frameGeo, frameMaterial);
          backFrame.position.set(
            xPos,
            yPos,
            -geometry.depth / 2 - windowDepth / 2 + 0.02,
          );
          buildingGroup.add(backFrame);

          const backWindow = new THREE.Mesh(windowGeo, windowMaterial);
          backWindow.position.set(
            xPos,
            yPos,
            -geometry.depth / 2 - windowDepth / 2,
          );
          buildingGroup.add(backWindow);
        }
      }

      // Side windows with frames
      const sideWindows = buildingType === 0 ? 3 : 2;
      for (let floor = 0; floor < floors; floor++) {
        for (let win = 0; win < sideWindows; win++) {
          const windowGeo = new THREE.BoxGeometry(
            windowDepth,
            windowSize * 1.5,
            windowSize * 0.8,
          );
          const frameGeo = new THREE.BoxGeometry(
            windowDepth + 0.05,
            windowSize * 1.6,
            windowSize * 0.9,
          );
          const zPos =
            (win - (sideWindows - 1) / 2) *
            (geometry.depth / (sideWindows + 0.5));
          const yPos = (floor + 0.5) * (geometry.height / floors);

          // Left side
          const leftFrame = new THREE.Mesh(frameGeo, frameMaterial);
          leftFrame.position.set(
            -geometry.width / 2 - windowDepth / 2 + 0.02,
            yPos,
            zPos,
          );
          buildingGroup.add(leftFrame);

          const leftWindow = new THREE.Mesh(windowGeo, windowMaterial);
          leftWindow.position.set(
            -geometry.width / 2 - windowDepth / 2,
            yPos,
            zPos,
          );
          buildingGroup.add(leftWindow);

          // Right side
          const rightFrame = new THREE.Mesh(frameGeo, frameMaterial);
          rightFrame.position.set(
            geometry.width / 2 + windowDepth / 2 - 0.02,
            yPos,
            zPos,
          );
          buildingGroup.add(rightFrame);

          const rightWindow = new THREE.Mesh(windowGeo, windowMaterial);
          rightWindow.position.set(
            geometry.width / 2 + windowDepth / 2,
            yPos,
            zPos,
          );
          buildingGroup.add(rightWindow);
        }
      }

      // Main entrance door (more prominent and detailed)
      const doorWidth = geometry.width * 0.35;
      const doorHeight = geometry.height * 0.18;
      const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.3);
      const doorMaterial = new THREE.MeshStandardMaterial({
        color:
          buildingType === 0
            ? 0x111111
            : buildingType === 2
              ? 0x8b4513
              : 0x333333,
        roughness: buildingType === 0 ? 0.3 : 0.9,
        metalness: buildingType === 0 ? 0.8 : 0.1,
      });
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      // Position door so it pivots from the left edge
      door.geometry.translate(doorWidth / 2, 0, 0); // Offset pivot point
      door.position.set(
        -doorWidth / 2,
        doorHeight / 2 + 0.1,
        geometry.depth / 2 + 0.15,
      );
      buildingGroup.add(door);
      buildingGroup.userData.door = door;

      // Door frame
      const doorFrameGeometry = new THREE.BoxGeometry(
        doorWidth * 1.15,
        doorHeight * 1.1,
        0.25,
      );
      const doorFrame = new THREE.Mesh(doorFrameGeometry, frameMaterial);
      doorFrame.position.set(
        0,
        doorHeight / 2 + 0.1,
        geometry.depth / 2 + 0.05,
      );
      buildingGroup.add(doorFrame);

      // Door handle
      const handleGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.9,
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.set(
        doorWidth * 0.35,
        doorHeight / 2 + 0.1,
        geometry.depth / 2 + 0.35,
      );
      buildingGroup.add(handle);

      // Door window (for some building types)
      if (buildingType !== 0) {
        const doorWindowGeo = new THREE.BoxGeometry(
          doorWidth * 0.4,
          doorHeight * 0.3,
          0.15,
        );
        const doorWindow = new THREE.Mesh(doorWindowGeo, windowMaterial);
        doorWindow.position.set(
          0,
          doorHeight * 0.7 + 0.1,
          geometry.depth / 2 + 0.2,
        );
        buildingGroup.add(doorWindow);
      }

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

      // Create interior room (bedroom) - initially hidden
      const interior = new THREE.Group();
      interior.visible = false;
      interior.position.set(0, 1.5, 0);

      // Room walls (back wall where profile will be displayed)
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a3e,
        roughness: 0.8,
      });

      const backWallGeo = new THREE.BoxGeometry(geometry.width * 0.9, 5, 0.2);
      const backWall = new THREE.Mesh(backWallGeo, wallMaterial);
      backWall.position.set(0, 2.5, -geometry.depth / 2 + 1);
      interior.add(backWall);

      // Floor
      const floorGeo = new THREE.BoxGeometry(
        geometry.width * 0.9,
        0.1,
        geometry.depth * 0.8,
      );
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3f35,
        roughness: 0.9,
      });
      const floor = new THREE.Mesh(floorGeo, floorMaterial);
      floor.position.set(0, 0, -geometry.depth / 4);
      interior.add(floor);

      // GitHub Profile Display - Avatar
      const avatarLoader = new THREE.TextureLoader();
      const avatarTexture = avatarLoader.load(
        user.avatar_url || `https://github.com/${user.login}.png`,
        () => {}, // onLoad
        undefined,
        () => {
          // onError - use fallback
          console.log(`Failed to load avatar for ${user.login}`);
        },
      );

      const avatarGeo = new THREE.BoxGeometry(2.5, 2.5, 0.1);
      const avatarMaterial = new THREE.MeshStandardMaterial({
        map: avatarTexture,
        emissive: 0x222222,
        emissiveIntensity: 0.3,
      });
      const avatarFrame = new THREE.Mesh(avatarGeo, avatarMaterial);
      avatarFrame.position.set(0, 6, -geometry.depth / 2 + 1.2);
      interior.add(avatarFrame);

      // Profile Info Canvas
      const profileCanvas = document.createElement("canvas");
      const profileCtx = profileCanvas.getContext("2d");
      profileCanvas.width = 1024;
      profileCanvas.height = 768;

      // Draw profile info with gradient background
      const gradient = profileCtx.createLinearGradient(
        0,
        0,
        0,
        profileCanvas.height,
      );
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#0f0f1a");
      profileCtx.fillStyle = gradient;
      profileCtx.fillRect(0, 0, profileCanvas.width, profileCanvas.height);

      // Username
      profileCtx.font = "bold 56px Arial";
      profileCtx.fillStyle = "#ffffff";
      profileCtx.textAlign = "center";
      profileCtx.fillText(user.login, profileCanvas.width / 2, 70);

      // Real name
      profileCtx.font = "32px Arial";
      profileCtx.fillStyle = "#aaaaaa";
      if (user.name) {
        profileCtx.fillText(user.name, profileCanvas.width / 2, 120);
      }

      // Bio
      let currentY = 170;
      if (user.bio) {
        profileCtx.font = "24px Arial";
        profileCtx.fillStyle = "#888888";
        const bioText = user.bio.substring(0, 120);
        const words = bioText.split(" ");
        let line = "";
        let lines = [];

        for (let word of words) {
          const testLine = line + word + " ";
          const metrics = profileCtx.measureText(testLine);
          if (metrics.width > 900 && line !== "") {
            lines.push(line);
            line = word + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        lines.slice(0, 2).forEach((bioLine) => {
          profileCtx.fillText(
            bioLine.trim(),
            profileCanvas.width / 2,
            currentY,
          );
          currentY += 35;
        });
        currentY += 20;
      } else {
        currentY += 20;
      }

      // Additional details
      profileCtx.font = "26px Arial";
      profileCtx.fillStyle = "#66ccff";

      if (user.company) {
        profileCtx.fillText(
          `🏢 ${user.company}`,
          profileCanvas.width / 2,
          currentY,
        );
        currentY += 40;
      }

      if (user.location) {
        profileCtx.fillText(
          `📍 ${user.location}`,
          profileCanvas.width / 2,
          currentY,
        );
        currentY += 40;
      }

      const joinYear = user.created_at
        ? new Date(user.created_at).getFullYear()
        : null;
      if (joinYear) {
        profileCtx.fillText(
          `📅 Member since ${joinYear}`,
          profileCanvas.width / 2,
          currentY,
        );
        currentY += 50;
      } else {
        currentY += 20;
      }

      // Stats Grid (4 items in 2 rows)
      profileCtx.font = "bold 32px Arial";
      const stats = [
        { icon: "📦", value: user.public_repos || 0, label: "Repos" },
        { icon: "👥", value: user.followers || 0, label: "Followers" },
        { icon: "👤", value: user.following || 0, label: "Following" },
        { icon: "📝", value: user.public_gists || 0, label: "Gists" },
      ];

      const statsStartY = currentY + 20;
      const col1X = 256;
      const col2X = 768;

      // First row
      profileCtx.fillStyle = "#4a9eff";
      profileCtx.fillText(stats[0].icon, col1X, statsStartY);
      profileCtx.fillText(String(stats[0].value), col1X, statsStartY + 45);
      profileCtx.font = "22px Arial";
      profileCtx.fillStyle = "#888888";
      profileCtx.fillText(stats[0].label, col1X, statsStartY + 75);

      profileCtx.font = "bold 32px Arial";
      profileCtx.fillStyle = "#4a9eff";
      profileCtx.fillText(stats[1].icon, col2X, statsStartY);
      profileCtx.fillText(String(stats[1].value), col2X, statsStartY + 45);
      profileCtx.font = "22px Arial";
      profileCtx.fillStyle = "#888888";
      profileCtx.fillText(stats[1].label, col2X, statsStartY + 75);

      // Second row
      const row2Y = statsStartY + 130;
      profileCtx.font = "bold 32px Arial";
      profileCtx.fillStyle = "#4a9eff";
      profileCtx.fillText(stats[2].icon, col1X, row2Y);
      profileCtx.fillText(String(stats[2].value), col1X, row2Y + 45);
      profileCtx.font = "22px Arial";
      profileCtx.fillStyle = "#888888";
      profileCtx.fillText(stats[2].label, col1X, row2Y + 75);

      profileCtx.font = "bold 32px Arial";
      profileCtx.fillStyle = "#4a9eff";
      profileCtx.fillText(stats[3].icon, col2X, row2Y);
      profileCtx.fillText(String(stats[3].value), col2X, row2Y + 45);
      profileCtx.font = "22px Arial";
      profileCtx.fillStyle = "#888888";
      profileCtx.fillText(stats[3].label, col2X, row2Y + 75);

      const profileTexture = new THREE.CanvasTexture(profileCanvas);
      const profileMaterial = new THREE.MeshStandardMaterial({
        map: profileTexture,
        emissive: 0x222233,
        emissiveIntensity: 0.5,
      });
      const profileBoard = new THREE.Mesh(
        new THREE.BoxGeometry(8, 6, 0.1),
        profileMaterial,
      );
      profileBoard.position.set(0, 2, -geometry.depth / 2 + 1.1);
      interior.add(profileBoard);

      // Room lighting - brighter to see profile clearly
      const roomLight = new THREE.PointLight(0x88ccff, 1.5, 15);
      roomLight.position.set(0, 4, -geometry.depth / 4);
      interior.add(roomLight);

      // Add ambient light in interior for better visibility
      const interiorAmbient = new THREE.AmbientLight(0x404060, 0.8);
      interior.add(interiorAmbient);

      // Spotlight on profile board for emphasis
      const profileSpotlight = new THREE.SpotLight(
        0xffffff,
        1.2,
        12,
        Math.PI / 6,
      );
      profileSpotlight.position.set(0, 4, 0);
      profileSpotlight.target.position.set(0, 2, -geometry.depth / 2 + 1.1);
      interior.add(profileSpotlight);
      interior.add(profileSpotlight.target);

      buildingGroup.add(interior);
      buildingGroup.userData.interior = interior;
      buildingGroup.userData.geometry = geometry; // Store for positioning calculations

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

  // Auto-zoom to newly searched/added buildings
  useEffect(() => {
    if (!newlyAddedUser || buildingsRef.current.length === 0) return;

    // Find the building for the newly added user
    const newBuilding = buildingsRef.current.find(
      (building) => building.userData.user.login === newlyAddedUser,
    );

    if (newBuilding) {
      // Zoom to the new building
      cameraTarget.current = newBuilding.position.clone();
      isZoomingToBuilding.current = true;
      newBuilding.userData.isOpen = true;
      selectedBuildingRef.current = newBuilding;

      // Clear the newly added user flag after a short delay
      setTimeout(() => {
        setNewlyAddedUser(null);
      }, 500);
    }
  }, [newlyAddedUser, users, setNewlyAddedUser]);

  // Create 3D info display on building
  const createBuildingInfoDisplay = (building) => {
    if (!building) return;

    const user = building.userData.user;
    const geometry = building.userData.geometry;

    // Remove old info sprites if any
    activatedInfoSpritesRef.current.forEach((sprite) => {
      building.remove(sprite);
    });
    activatedInfoSpritesRef.current = [];

    // Create rounded avatar with glow effect
    const avatarSize = 2.75;
    const avatarUrl = user.avatar_url || `https://github.com/${user.login}.png`;

    // Load and create rounded avatar
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const avatarCanvas = document.createElement("canvas");
      const size = 512;
      avatarCanvas.width = size;
      avatarCanvas.height = size;
      const avatarCtx = avatarCanvas.getContext("2d");

      // Create circular clip
      avatarCtx.beginPath();
      avatarCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      avatarCtx.closePath();
      avatarCtx.clip();

      // Draw image
      avatarCtx.drawImage(img, 0, 0, size, size);

      // Create texture from canvas
      const avatarTexture = new THREE.CanvasTexture(avatarCanvas);
      const avatarMaterial = new THREE.SpriteMaterial({
        map: avatarTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const avatarSprite = new THREE.Sprite(avatarMaterial);
      avatarSprite.position.set(0, geometry.height + 4, geometry.depth / 2 + 1);
      avatarSprite.scale.set(avatarSize, avatarSize, 1);
      avatarSprite.renderOrder = 999;
      building.add(avatarSprite);
      activatedInfoSpritesRef.current.push(avatarSprite);
    };
    img.src = avatarUrl;

    // Create helper function for polished text textures with gradient
    const createInfoTexture = (
      text,
      fontSize = 40,
      color = "#ffffff",
      width = 512,
      height = 128,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Gradient background for depth
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(20, 20, 40, 0.95)");
      gradient.addColorStop(1, "rgba(10, 10, 30, 0.95)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle border glow
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.globalAlpha = 1;

      // Text with shadow for depth
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, width / 2, height / 2);

      return new THREE.CanvasTexture(canvas);
    };

    // Username display
    const nameTexture = createInfoTexture(
      user.login.toUpperCase(),
      55,
      "#00d9ff",
      640,
      120,
    );
    const nameMaterial = new THREE.SpriteMaterial({
      map: nameTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const nameSprite = new THREE.Sprite(nameMaterial);
    nameSprite.position.set(0, geometry.height + 1.5, geometry.depth / 2 + 1);
    nameSprite.scale.set(6.5, 1.2, 1);
    nameSprite.renderOrder = 999;
    building.add(nameSprite);
    activatedInfoSpritesRef.current.push(nameSprite);

    // Stats in column layout
    const stats = [
      {
        label: "REPOS",
        value: user.public_repos || 0,
        color: "#3b82f6",
        x: 0,
        y: 3.2,
      },
      {
        label: "FOLLOWERS",
        value: user.followers || 0,
        color: "#10b981",
        x: 0,
        y: 1.2,
      },
      {
        label: "FOLLOWING",
        value: user.following || 0,
        color: "#8b5cf6",
        x: 0,
        y: -0.8,
      },
      {
        label: "GISTS",
        value: user.public_gists || 0,
        color: "#f59e0b",
        x: 0,
        y: -2.8,
      },
    ];

    stats.forEach((stat) => {
      // Create stat card
      const statTexture = createInfoTexture(
        `${stat.value}`,
        90,
        stat.color,
        320,
        150,
      );
      const statMaterial = new THREE.SpriteMaterial({
        map: statTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const statSprite = new THREE.Sprite(statMaterial);
      statSprite.position.set(
        stat.x,
        geometry.height * 0.5 + stat.y,
        geometry.depth / 2 + 0.8,
      );
      statSprite.scale.set(3.8, 1.5, 1);
      statSprite.renderOrder = 999;
      building.add(statSprite);
      activatedInfoSpritesRef.current.push(statSprite);

      // Add label below number
      const labelTexture = createInfoTexture(
        stat.label,
        36,
        stat.color,
        320,
        70,
      );
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.position.set(
        stat.x,
        geometry.height * 0.5 + stat.y - 1.0,
        geometry.depth / 2 + 0.8,
      );
      labelSprite.scale.set(2.5, 0.6, 1);
      labelSprite.renderOrder = 999;
      building.add(labelSprite);
      activatedInfoSpritesRef.current.push(labelSprite);
    });
  };

  // Handle closing/deactivating building
  const handleCloseProfile = () => {
    if (selectedBuildingRef.current) {
      selectedBuildingRef.current.userData.isOpen = false;
      selectedBuildingRef.current.userData.isActivated = false;

      // Remove info sprites
      activatedInfoSpritesRef.current.forEach((sprite) => {
        selectedBuildingRef.current.remove(sprite);
      });
      activatedInfoSpritesRef.current = [];
    }
    // Unlock camera
    isViewingBuilding.current = false;
  };

  // Handle entering building when door button is clicked
  const handleEnterBuilding = () => {
    if (selectedBuildingRef.current && showEnterPromptRef.current) {
      // Open door and activate building (lights turn on)
      selectedBuildingRef.current.userData.isOpen = true;
      selectedBuildingRef.current.userData.isActivated = true;

      // Hide the enter button
      setShowEnterPrompt(false);

      // Create 3D info display on the building
      createBuildingInfoDisplay(selectedBuildingRef.current);

      // Switch from waiting at door to viewing building (keep camera locked)
      isWaitingAtDoor.current = false;
      isViewingBuilding.current = true;
      // Keep lockedCameraPosition.current as is - don't clear it
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", touchAction: "none" }}
      />
      <SearchBar />

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

      {/* WebGL Error */}
      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/95">
          <div className="max-w-md text-center p-8 bg-slate-800 border-2 border-red-500 rounded-lg">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              WebGL Not Available
            </h2>
            <p className="text-slate-300 mb-4">
              Your browser or hosting environment doesn't support WebGL, which
              is required for 3D graphics.
            </p>
            <div className="text-left text-slate-400 text-sm space-y-2 mb-6">
              <p className="font-semibold text-slate-300">
                Possible solutions:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Enable hardware acceleration in your browser settings</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
                <li>Update your graphics drivers</li>
                <li>Use a device with better graphics support</li>
              </ul>
            </div>
            <a
              href="https://get.webgl.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              Check WebGL Support
            </a>
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
