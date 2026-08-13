import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, ContactShadows, Environment } from "@react-three/drei";
import { MathUtils, Object3D, Vector3 } from "three";
import { useReducedMotion } from "framer-motion";
import { createRandom } from "../random";

/* Geometry, materials, lighting and per-frame maths below mirror the reference
   scene. Positions are in world units; the camera sits at [0, 1.2, 6.5]. */

const WHEEL_POSITIONS = [
  [-0.85, 0, 0.65],
  [-0.85, 0, -0.65],
  [0.85, 0, 0.65],
  [0.85, 0, -0.65],
];

const HUB_POSITIONS = [
  [-0.85, 0, 0.74],
  [-0.85, 0, -0.74],
  [0.85, 0, 0.74],
  [0.85, 0, -0.74],
];

const CORNER_POSITIONS = [
  [1.05, 0.75, 0.75],
  [-1.05, 0.75, 0.75],
  [1.05, -0.75, 0.75],
  [-1.05, -0.75, 0.75],
];

/** A drop of blood falling into the box, then resting with a slight bob. */
function BloodSphere({ position, delay, size = 0.12, frozen }) {
  const ref = useRef(null);
  const materialRef = useRef(null);
  const startY = 3.5;

  useFrame(({ clock }) => {
    if (frozen || !ref.current) return;
    // 5s cycle: 3s of falling, then it settles into the box.
    const t = (clock.getElapsedTime() + delay) % 5;
    if (t < 3) {
      ref.current.position.y = startY - t * 1.3;
      ref.current.scale.setScalar(0.8 + Math.sin(t * 3) * 0.15);
      if (materialRef.current) materialRef.current.opacity = Math.min(1, t * 2);
    } else {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + delay) * 0.03;
      ref.current.scale.setScalar(0.75);
    }
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      <sphereGeometry args={[size, 24, 24]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color="#dc2626"
        emissive="#7f1d1d"
        emissiveIntensity={0.6}
        roughness={0.1}
        metalness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.1}
        transmission={0.3}
        ior={1.4}
        transparent
      />
    </mesh>
  );
}

/** Green motes drifting around the box, drawn as one instanced mesh. */
function FloatingParticles({ count = 25, frozen }) {
  const ref = useRef(null);
  const dummy = useMemo(() => new Object3D(), []);

  const particles = useMemo(() => {
    const random = createRandom(0x5eed01 + count);
    return Array.from({ length: count }, () => ({
      pos: new Vector3((random() - 0.5) * 8, (random() - 0.5) * 6, (random() - 0.5) * 4),
      speed: 0.2 + random() * 0.5,
      offset: random() * Math.PI * 2,
      scale: 0.02 + random() * 0.04,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (frozen || !ref.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.pos.x + Math.sin(t * p.speed + p.offset) * 0.5,
        p.pos.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.4,
        p.pos.z + Math.sin(t * p.speed * 0.5) * 0.3
      );
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t * 2 + p.offset) * 0.3));
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00e676" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/** The donation box itself. Eases toward the cursor rather than snapping. */
function DonationBox({ rotation, frozen }) {
  const group = useRef(null);
  const ring = useRef(null);

  useFrame(({ clock }) => {
    if (frozen || !group.current) return;
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, rotation[0], 0.06);
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, rotation[1], 0.06);
    if (ring.current) {
      ring.current.material.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 3) * 0.4;
    }
  });

  return (
    <group ref={group}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 1.6, 1.6]} />
        <meshPhysicalMaterial
          color="#f0f4f8"
          roughness={0.3}
          metalness={0.05}
          clearcoat={0.4}
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Front red cross */}
      <mesh position={[0, 0, 0.81]}>
        <boxGeometry args={[1.2, 0.28, 0.06]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.81]}>
        <boxGeometry args={[0.28, 1.2, 0.06]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7} roughness={0.2} />
      </mesh>

      {/* Back cross, dimmer */}
      <mesh position={[0, 0, -0.81]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.81]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>

      {/* Lid and carry ring */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[2.28, 0.06, 1.68]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.3} metalness={0.4} clearcoat={0.5} />
      </mesh>
      <mesh ref={ring} position={[0, 1, 0]}>
        <torusGeometry args={[0.28, 0.05, 16, 48]} />
        <meshStandardMaterial
          color="#dc2626"
          emissive="#ff4444"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.6}
        />
      </mesh>

      {CORNER_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/** Ambulance crossing the scene on a 10s loop, beacon strobing as it goes. */
function Ambulance({ frozen }) {
  const group = useRef(null);
  const beacon = useRef(null);
  const wheels = useRef([]);

  useFrame(({ clock }) => {
    if (frozen || !group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.x = (t % 10) - 5;
    group.current.position.y = -1.5;

    wheels.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x = t * 8;
    });

    if (beacon.current) {
      const mat = beacon.current.material;
      mat.emissiveIntensity = 1 + Math.sin(t * 12) * 1;
      mat.color.setHSL(((Math.sin(t * 6) + 1) / 2) * 0.05, 1, 0.5);
    }
  });

  return (
    <group ref={group} scale={0.32}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2.6, 0.85, 1.25]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} metalness={0.1} clearcoat={0.6} />
      </mesh>
      <mesh castShadow position={[0.95, 0.97, 0]}>
        <boxGeometry args={[0.72, 0.52, 1.12]} />
        <meshPhysicalMaterial color="#e0f2f1" roughness={0.2} metalness={0.05} clearcoat={0.8} />
      </mesh>
      <mesh position={[1.32, 0.97, 0]}>
        <boxGeometry args={[0.02, 0.45, 1]} />
        <meshPhysicalMaterial color="#80cbc4" roughness={0.1} metalness={0.1} transmission={0.6} ior={1.5} />
      </mesh>

      <mesh position={[-0.4, 0.4, 0.635]}>
        <boxGeometry args={[0.5, 0.12, 0.02]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.4, 0.4, 0.635]}>
        <boxGeometry args={[0.12, 0.5, 0.02]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.15, 0.64]}>
        <boxGeometry args={[2.5, 0.06, 0.01]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>

      <mesh ref={beacon} position={[0.95, 1.28, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.45]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={1.5} />
      </mesh>

      {WHEEL_POSITIONS.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) wheels.current[i] = el;
          }}
          position={pos}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.22, 0.22, 0.16, 20]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {HUB_POSITIONS.map((pos, i) => (
        <mesh key={`hub-${i}`} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.8} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/** Slowly turning double helix off to the right of the box. */
function DnaHelix({ frozen }) {
  const group = useRef(null);

  const strands = useMemo(() => {
    const items = [];
    for (let i = 0; i < 20; i++) {
      const y = i * 0.25 - 2.5;
      const angle = i * 0.5;
      items.push({
        pos1: [Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3],
        pos2: [Math.cos(angle + Math.PI) * 0.3, y, Math.sin(angle + Math.PI) * 0.3],
        y,
      });
    }
    return items;
  }, []);

  useFrame(({ clock }) => {
    if (frozen || !group.current) return;
    group.current.rotation.y = clock.getElapsedTime() * 0.3;
  });

  return (
    <group ref={group} position={[3.5, 0, -1]} scale={0.6}>
      {strands.map((strand, i) => (
        <group key={i}>
          <mesh position={strand.pos1}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={strand.pos2}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0, strand.y, 0]}>
              <boxGeometry args={[0.6, 0.01, 0.01]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * The drei `Environment` preset streams an HDR from a CDN. If that request is
 * blocked the scene should still render, just with plainer reflections.
 */
class OptionalEnvironment extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function Scene({ frozen }) {
  const [rotation, setRotation] = useState([0, 0]);
  const { size } = useThree();

  useEffect(() => {
    if (frozen) return undefined;
    // Touch devices have no hover cursor, so the box just floats there instead.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;

    const onPointerMove = (event) => {
      // Cursor mapped into a shallow rotation range so the box leans, never spins.
      const x = (event.clientX / size.width) * 2 - 1;
      const y = (event.clientY / size.height) * 2 - 1;
      setRotation([x * 0.4, y * 0.25]);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [size, frozen]);

  const drops = useMemo(() => {
    const random = createRandom(0xd120b);
    return Array.from({ length: 8 }, (_, i) => ({
      pos: [(random() - 0.5) * 1.6, -0.5 + (i % 4) * 0.12, (random() - 0.5) * 1.2],
      delay: i * 0.5,
      size: 0.08 + random() * 0.06,
    }));
  }, []);

  return (
    <>
      <ambientLight intensity={0.35} color="#e0f7fa" />
      <directionalLight
        position={[5, 6, 5]}
        intensity={1.5}
        castShadow
        color="#ffffff"
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, 3, -3]} color="#dc2626" intensity={0.6} distance={12} />
      <pointLight position={[4, -1, 3]} color="#00e676" intensity={0.4} distance={10} />
      <spotLight position={[0, 8, 0]} angle={0.3} penumbra={0.8} intensity={0.5} color="#e0f7fa" />

      <Float speed={frozen ? 0 : 1.2} rotationIntensity={0.15} floatIntensity={0.35}>
        <DonationBox rotation={rotation} frozen={frozen} />
      </Float>

      {drops.map((drop, i) => (
        <BloodSphere key={i} position={drop.pos} delay={drop.delay} size={drop.size} frozen={frozen} />
      ))}

      <FloatingParticles count={25} frozen={frozen} />
      <DnaHelix frozen={frozen} />
      <Ambulance frozen={frozen} />

      <ContactShadows position={[0, -1.65, 0]} opacity={0.5} scale={10} blur={2.8} far={4} />
      <OptionalEnvironment>
        <Environment preset="city" />
      </OptionalEnvironment>
    </>
  );
}

function DonationBox3D({ className = "" }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`ll-stage ${className}`}>
      <Canvas
        camera={{ position: [0, 1.2, 6.5], fov: 42 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene frozen={Boolean(reducedMotion)} />
      </Canvas>
      <div className="ll-stage-vignette" aria-hidden="true" />
    </div>
  );
}

export default DonationBox3D;
