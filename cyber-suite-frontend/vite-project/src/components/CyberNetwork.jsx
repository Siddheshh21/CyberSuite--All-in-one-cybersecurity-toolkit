import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { extend, Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

const Node = ({ position, scale = 1, color = '#00ffff' }) => {
  const ref = useRef();

  useFrame((state) => {
    ref.current.scale.setScalar(
      scale + Math.sin(state.clock.elapsedTime * 2) * 0.1
    );
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

const Line = ({ start, end, color = '#00ffff' }) => {
  const ref = useRef();

  useEffect(() => {
    const points = [];
    points.push(new THREE.Vector3(...start));
    points.push(new THREE.Vector3(...end));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    ref.current.geometry = geometry;
  }, [start, end]);

  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  );
};

const NetworkGraph = () => {
  const nodes = useRef([]);
  const lines = useRef([]);
  const frameRef = useRef(true);
  const animationRef = useRef(0);

  useEffect(() => {
    // Generate random nodes with fewer nodes for better performance
    nodes.current = Array.from({ length: 8 }, () => ({
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 2
      ],
      scale: Math.random() * 0.3 + 0.3,
      speed: Math.random() * 0.2 + 0.1
    }));

    // Generate fewer connections between nodes
    lines.current = [];
    nodes.current.forEach((node, i) => {
      const target = (i + 1) % nodes.current.length;
      lines.current.push({
        start: node.position,
        end: nodes.current[target].position
      });
    });

    return () => {
      frameRef.current = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useFrame((state) => {
    if (!frameRef.current) return;

    // Animate nodes with optimized calculations
    const time = state.clock.elapsedTime;
    nodes.current.forEach((node, i) => {
      const angle = time * node.speed + i;
      node.position[0] += Math.sin(angle) * 0.001;
      node.position[1] += Math.cos(angle) * 0.001;
    });

    // Update lines with minimal array operations
    lines.current.forEach((line) => {
      Object.assign(line.start, line.start);
      Object.assign(line.end, line.end);
    });
  });

  return (
    <>
      {nodes.current.map((node, i) => (
        <Node key={`node-${i}`} position={node.position} scale={node.scale} />
      ))}
      {lines.current.map((line, i) => (
        <Line key={`line-${i}`} start={line.start} end={line.end} />
      ))}
    </>
  );
};

const CyberNetwork = () => {
  const frameRef = useRef(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => {
      frameRef.current = false;
      if (canvasRef.current) {
        canvasRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 0, 10], fov: 75 }}
        dpr={window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={['#000']} />
        <NetworkGraph />
        <EffectComposer>
          <Bloom luminanceThreshold={0.7} intensity={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default CyberNetwork;