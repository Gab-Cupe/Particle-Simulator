import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, ShaderMaterial } from "three";

type Vec3 = [number, number, number];

interface TrailLineProps {
  points: Vec3[];
  color: string;
}

const TrailLine: React.FC<TrailLineProps> = ({ points, color }) => {
  const { geometry, material } = useMemo(() => {
    const geom = new BufferGeometry();
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute vec4 color;
        varying vec4 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec4 vColor;
        void main() {
          if (vColor.a < 0.01) discard;
          gl_FragColor = vColor;
        }
      `,
    });

    return { geometry: geom, material: mat };
  }, []);

  useEffect(() => {
    if (points.length < 2) return;

    const total = points.length;
    const segments = total - 1;
    const positions = new Float32Array(segments * 2 * 3);
    const colors = new Float32Array(segments * 2 * 4);
    const base = new Color(color);

    for (let i = 0; i < segments; i++) {
      const start = points[i];
      const end = points[i + 1];
      const t0 = i / (total - 1);
      const t1 = (i + 1) / (total - 1);
      const a0 = Math.pow(t0, 1.6);
      const a1 = Math.pow(t1, 1.6);

      const posIndex = i * 6;
      positions[posIndex] = start[0];
      positions[posIndex + 1] = start[1];
      positions[posIndex + 2] = start[2];
      positions[posIndex + 3] = end[0];
      positions[posIndex + 4] = end[1];
      positions[posIndex + 5] = end[2];

      const colorIndex = i * 8;
      colors[colorIndex] = base.r;
      colors[colorIndex + 1] = base.g;
      colors[colorIndex + 2] = base.b;
      colors[colorIndex + 3] = a0;
      colors[colorIndex + 4] = base.r;
      colors[colorIndex + 5] = base.g;
      colors[colorIndex + 6] = base.b;
      colors[colorIndex + 7] = a1;
    }

    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 4));
    geometry.computeBoundingSphere();
  }, [color, geometry, points]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (points.length < 2) return null;

  return <lineSegments geometry={geometry} material={material} />;
};

export default TrailLine;
