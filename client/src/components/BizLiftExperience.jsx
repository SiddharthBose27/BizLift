import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, RoundedBox, Sparkles } from "@react-three/drei";
import gsap from "gsap";
import { motion } from "motion/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useGSAP } from "@gsap/react";
import { Activity, ArrowUpRight, Boxes, BrainCircuit, TrendingUp } from "lucide-react";

function CoreScene({ compact = false }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.18;
      group.current.rotation.x = Math.sin(Date.now() * 0.00035) * 0.08;
    }
  });
  return (
    <group ref={group}>
      <Float speed={1.3} rotationIntensity={0.25} floatIntensity={0.55}>
        <RoundedBox args={[1.45, 1.45, 1.45]} radius={0.25} smoothness={6}>
          <meshStandardMaterial color="#9ad17b" metalness={0.72} roughness={0.2} emissive="#9ad17b" emissiveIntensity={0.08} />
        </RoundedBox>
        <mesh scale={0.68}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#080a08" metalness={0.85} roughness={0.18} />
        </mesh>
      </Float>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[compact ? 1.45 : 1.8, 0.012, 12, 100]} />
        <meshBasicMaterial color="#9ad17b" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[0.7, 0.2, 0.8]}>
        <torusGeometry args={[compact ? 1.8 : 2.15, 0.009, 12, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

export function BizLift3D({ compact = false, className = "" }) {
  return (
    <div className={`bizlift-3d-stage ${compact ? "bizlift-3d-stage-compact" : ""} ${className}`} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, compact ? 5.5 : 6.5], fov: 42 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <pointLight position={[3, 3, 4]} intensity={18} color="#9ad17b" />
        <pointLight position={[-3, -2, 2]} intensity={8} color="#ffffff" />
        <CoreScene compact={compact} />
        <Sparkles count={compact ? 30 : 70} scale={compact ? 4.5 : 7} size={2} speed={0.25} color="#9ad17b" />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} maxPolarAngle={Math.PI / 1.65} minPolarAngle={Math.PI / 2.7} />
      </Canvas>
    </div>
  );
}

export function ExperienceLayer({ variant = "ambient" }) {
  const root = useRef(null);
  useGSAP(() => {
    if (!root.current) return;
    gsap.fromTo(root.current.querySelectorAll("[data-experience-item]"),
      { opacity: 0, y: 18, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.75, stagger: 0.08, ease: "power3.out" }
    );
  }, { scope: root });

  if (variant === "hero") {
    return (
      <div ref={root} className="bizlift-experience-hero" aria-hidden="true">
        <BizLift3D />
        <Tooltip.Provider delayDuration={250}><Tooltip.Root><Tooltip.Trigger asChild><motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.35}} data-experience-item className="bizlift-orb-label bizlift-orb-label-a"><Activity size={14}/> Live operations</motion.div></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="bottom" className="bizlift-tooltip">Operational activity is being monitored live.<Tooltip.Arrow /></Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>
        <div data-experience-item className="bizlift-orb-label bizlift-orb-label-b"><TrendingUp size={14}/> Demand +18.4%</div>
        <div data-experience-item className="bizlift-orb-label bizlift-orb-label-c"><Boxes size={14}/> Stock synced</div>
      </div>
    );
  }

  return (
    <div ref={root} className={`bizlift-ambient-layer bizlift-ambient-${variant}`} aria-hidden="true">
      <span data-experience-item className="bizlift-ambient-pulse bizlift-ambient-pulse-1" />
      <span data-experience-item className="bizlift-ambient-pulse bizlift-ambient-pulse-2" />
      <span data-experience-item className="bizlift-ambient-line" />
      {(variant === "dashboard" || variant === "analytics") ? (
        <div className="bizlift-mini-3d"><BizLift3D compact /></div>
      ) : null}
    </div>
  );
}

export function IntelligenceRibbon({ label = "LIVE INTELLIGENCE", value = "Operations synchronized", icon: Icon = BrainCircuit }) {
  return (
    <div className="bizlift-intelligence-ribbon" data-experience-item>
      <span className="bizlift-live-dot" />
      <Icon size={15} />
      <span className="bizlift-ribbon-label">{label}</span>
      <span className="bizlift-ribbon-value">{value}</span>
      <ArrowUpRight size={15} className="opacity-50" />
    </div>
  );
}
