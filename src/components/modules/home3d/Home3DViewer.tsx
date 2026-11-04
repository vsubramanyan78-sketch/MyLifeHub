import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Wrench,
  Sparkles,
  Gamepad2,
  Maximize2,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Shield,
  Layers,
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { formatCurrency } from '../../../lib/currency';

interface Home3DViewerProps {
  onServiceAsset?: (assetName: string) => void;
}

export const Home3DViewer: React.FC<Home3DViewerProps> = ({ onServiceAsset }) => {
  const { assets, maintenanceRecords } = useData();

  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<any | null>(null);

  // Game Mode State
  const [isGameMode, setIsGameMode] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameTimer, setGameTimer] = useState(45);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeHazard, setActiveHazard] = useState<string | null>(null);

  // Web Audio Synth for sound feedback
  const playSynthBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // AudioContext policy
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.FogExp2('#090d16', 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(12, 10, 14);
    camera.lookAt(0, 1.5, 0);

    // 2. Renderer with Studio PBR ToneMapping
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#88aaff', '#223344', 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.8);
    keyLight.position.set(10, 16, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const accentLight = new THREE.PointLight('#3b82f6', 3.0, 15);
    accentLight.position.set(-4, 3, -2);
    scene.add(accentLight);

    const warmAccent = new THREE.PointLight('#f59e0b', 2.0, 12);
    warmAccent.position.set(4, 2.5, 3);
    scene.add(warmAccent);

    // 4. Floor / Architectural Grid
    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0d1321',
      roughness: 0.85,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(32, 32, '#1e293b', '#0f172a');
    grid.position.y = 0.01;
    scene.add(grid);

    // Clickable interactive objects pool
    const interactables: THREE.Object3D[] = [];

    // Helper: Build Procedural Refrigerator (LG Smart Inverter 674L)
    const createRefrigerator = () => {
      const fridgeGroup = new THREE.Group();
      fridgeGroup.name = 'LG Inverter Refrigerator';

      // Main body
      const bodyGeo = new THREE.BoxGeometry(1.6, 3.2, 1.4);
      const steelMat = new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        metalness: 0.85,
        roughness: 0.25,
      });
      const body = new THREE.Mesh(bodyGeo, steelMat);
      body.position.y = 1.6;
      body.castShadow = true;
      body.receiveShadow = true;
      fridgeGroup.add(body);

      // Top French Doors
      const doorMat = new THREE.MeshStandardMaterial({
        color: '#64748b',
        metalness: 0.9,
        roughness: 0.2,
      });
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.8, 0.1), doorMat);
      leftDoor.position.set(-0.39, 2.2, 0.75);
      fridgeGroup.add(leftDoor);

      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.8, 0.1), doorMat);
      rightDoor.position.set(0.39, 2.2, 0.75);
      fridgeGroup.add(rightDoor);

      // Handles
      const handleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1 });
      const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 16), handleMat);
      leftHandle.position.set(-0.1, 2.2, 0.82);
      fridgeGroup.add(leftHandle);

      const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 16), handleMat);
      rightHandle.position.set(0.1, 2.2, 0.82);
      fridgeGroup.add(rightHandle);

      // Smart Display Glow Panel
      const screenMat = new THREE.MeshBasicMaterial({ color: '#00e5ff' });
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.2), screenMat);
      display.position.set(0.4, 2.5, 0.81);
      fridgeGroup.add(display);

      fridgeGroup.position.set(-4, 0, -2);
      scene.add(fridgeGroup);
      interactables.push(body);
      return fridgeGroup;
    };

    // Helper: Build Procedural Workstation / MacBook Pro
    const createWorkstation = () => {
      const deskGroup = new THREE.Group();
      deskGroup.name = 'Apple MacBook Pro Workstation';

      // Desk tabletop
      const deskMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.4 });
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 1.5), deskMat);
      deskTop.position.y = 1.4;
      deskTop.castShadow = true;
      deskGroup.add(deskTop);

      // Desk legs
      const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.2 });
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4), legMat);
      leg1.position.set(-1.3, 0.7, -0.6);
      deskGroup.add(leg1);
      const leg2 = leg1.clone();
      leg2.position.set(1.3, 0.7, -0.6);
      deskGroup.add(leg2);
      const leg3 = leg1.clone();
      leg3.position.set(-1.3, 0.7, 0.6);
      deskGroup.add(leg3);
      const leg4 = leg1.clone();
      leg4.position.set(1.3, 0.7, 0.6);
      deskGroup.add(leg4);

      // MacBook Base
      const aluMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.95, roughness: 0.15 });
      const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.45), aluMat);
      laptopBase.position.set(0, 1.46, 0);
      laptopBase.castShadow = true;
      deskGroup.add(laptopBase);

      // Laptop Screen Lid (tilted)
      const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.015), aluMat);
      laptopScreen.position.set(0, 1.68, -0.2);
      laptopScreen.rotation.x = 0.25;
      deskGroup.add(laptopScreen);

      // Screen glow
      const screenGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.66, 0.4),
        new THREE.MeshBasicMaterial({ color: '#3b82f6' })
      );
      screenGlow.position.set(0, 1.68, -0.19);
      screenGlow.rotation.x = 0.25;
      deskGroup.add(screenGlow);

      deskGroup.position.set(3, 0, -3);
      scene.add(deskGroup);
      interactables.push(deskTop);
      return deskGroup;
    };

    // Helper: Build Procedural Vehicle (Hyundai Creta)
    const createVehicle = () => {
      const carGroup = new THREE.Group();
      carGroup.name = 'Hyundai Creta Vehicle';

      const carPaint = new THREE.MeshStandardMaterial({
        color: '#dc2626',
        metalness: 0.85,
        roughness: 0.2,
      });

      // Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 4.2), carPaint);
      chassis.position.y = 0.7;
      chassis.castShadow = true;
      carGroup.add(chassis);

      // Cabin / Roof
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#0f172a',
        metalness: 0.9,
        roughness: 0.1,
      });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 2.4), glassMat);
      cabin.position.set(0, 1.35, -0.2);
      carGroup.add(cabin);

      // Wheels
      const tireMat = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.9 });
      const rimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9 });
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 24);

      const makeWheel = (x: number, z: number) => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.42, z);
        wheel.castShadow = true;
        carGroup.add(wheel);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.37, 16), rimMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(x, 0.42, z);
        carGroup.add(rim);
      };

      makeWheel(1.2, 1.3);
      makeWheel(-1.2, 1.3);
      makeWheel(1.2, -1.3);
      makeWheel(-1.2, -1.3);

      // Headlights
      const lightMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), lightMat);
      leftLight.position.set(-0.8, 0.8, 2.11);
      carGroup.add(leftLight);
      const rightLight = leftLight.clone();
      rightLight.position.set(0.8, 0.8, 2.11);
      carGroup.add(rightLight);

      carGroup.position.set(0, 0, 4);
      scene.add(carGroup);
      interactables.push(chassis);
      return carGroup;
    };

    const fridge = createRefrigerator();
    const desk = createWorkstation();
    const car = createVehicle();

    // 5. Mouse Orbit & Raycasting
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let sphericalTheta = Math.PI / 4;
    let sphericalPhi = Math.PI / 3;
    let sphericalRadius = 18;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      sphericalTheta -= deltaX * 0.006;
      sphericalPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalPhi - deltaY * 0.006));

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactables, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        let parentGroup: THREE.Object3D | null = hit;
        while (parentGroup && !parentGroup.name && parentGroup.parent) {
          parentGroup = parentGroup.parent;
        }

        const itemName = parentGroup?.name || hit.name || 'Household Asset';
        setSelectedItemName(itemName);

        // Find matching asset in database
        const matched = assets.find((a) =>
          itemName.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]) ||
          a.name.toLowerCase().includes(itemName.toLowerCase().split(' ')[0])
        );
        setSelectedAssetDetails(matched || null);

        playSynthBeep(587.33, 'triangle', 0.12);

        // Game mode scoring
        if (isGameMode) {
          setGameScore((prev) => prev + 100);
          playSynthBeep(880, 'sine', 0.2);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      sphericalRadius = Math.max(8, Math.min(30, sphericalRadius + e.deltaY * 0.02));
      e.preventDefault();
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel);

    // 6. 60fps Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Camera position from spherical coordinates
      camera.position.x = sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
      camera.position.y = sphericalRadius * Math.cos(sphericalPhi);
      camera.position.z = sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
      camera.lookAt(0, 1.2, 0);

      // Subtle float or rotation
      fridge.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement.parentNode);
      }
      renderer.dispose();
    };
  }, [assets, isGameMode, soundEnabled]);

  // Game countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isGameMode && gameTimer > 0) {
      interval = setInterval(() => {
        setGameTimer((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGameMode, gameTimer]);

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Control Dock */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2 backdrop-blur-md pointer-events-auto shadow-xl">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-extrabold text-xs text-white tracking-wide">
            3D Household Digital Twin
          </span>
          <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
            Orbit: Drag • Zoom: Scroll
          </span>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute Audio Synth' : 'Enable Audio Synth'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setIsGameMode(!isGameMode);
              if (!isGameMode) {
                setGameScore(0);
                setGameTimer(45);
                setGameOver(false);
                playSynthBeep(440, 'sine', 0.3);
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
              isGameMode
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>{isGameMode ? 'Exit Simulator' : 'Play Asset Inspection Game'}</span>
          </button>
        </div>
      </div>

      {/* Game HUD Overlay */}
      {isGameMode && (
        <div className="absolute top-16 left-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-xs pointer-events-auto backdrop-blur-md shadow-xl flex items-center space-x-4">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Time Left</span>
            <span className={`text-lg font-black ${gameTimer < 10 ? 'text-rose-500' : 'text-white'}`}>
              {gameTimer}s
            </span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Inspection Score</span>
            <span className="text-lg font-black text-amber-400">{gameScore} pts</span>
          </div>
          <div className="text-[11px] text-slate-300 border-l border-slate-800 pl-4 hidden sm:block">
            🎯 Click appliances to inspect and repair before time expires!
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameMode && gameOver && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-30">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center max-w-sm space-y-4 shadow-2xl">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-extrabold text-white">Inspection Simulation Completed!</h3>
            <p className="text-xs text-slate-400">
              You scored <span className="font-bold text-amber-400 text-base">{gameScore}</span> points keeping your household assets monitored and serviced.
            </p>
            <button
              onClick={() => {
                setGameScore(0);
                setGameTimer(45);
                setGameOver(false);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Selected Asset Inspection Drawer */}
      {selectedItemName && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 pointer-events-auto backdrop-blur-md shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedItemName}</span>
            </span>
            <button
              onClick={() => setSelectedItemName(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedAssetDetails ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Condition:</span>
                <span className="font-semibold text-emerald-400">
                  {selectedAssetDetails.condition}
                </span>
              </div>
              {selectedAssetDetails.warrantyEndDate && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Warranty:</span>
                  <span className="text-amber-400 font-medium">
                    {selectedAssetDetails.warrantyEndDate}
                  </span>
                </div>
              )}
              {selectedAssetDetails.purchasePrice && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Cost:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(
                      selectedAssetDetails.purchasePrice,
                      selectedAssetDetails.currency || 'INR'
                    )}
                  </span>
                </div>
              )}
              {selectedAssetDetails.notes && (
                <p className="text-[11px] text-slate-400 bg-slate-800/60 p-2 rounded-xl">
                  {selectedAssetDetails.notes}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Interactive 3D model. Register this asset in FixFlow to track live warranties and scheduled service history.
            </p>
          )}

          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => {
                if (onServiceAsset) onServiceAsset(selectedItemName);
                setSelectedItemName(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors"
            >
              Schedule Service in FixFlow
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
