import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, Color, ShaderMaterial, TubeGeometry, Vector3 } from "three";

type Vec3 = [number, number, number];

interface TrailLineProps {
  points: Vec3[];
  color: string;
  width?: number;
}

const BASE_RADIUS = 0.02;
const RADIAL_SEGMENTS = 6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TrailLine: React.FC<TrailLineProps> = ({ points, color, width = 1 }) => {
  const material = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new Color(color) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          float alpha = pow(vUv.x, 1.6) * uOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }, []);

  useEffect(() => {
    material.uniforms.uColor.value.set(color);
  }, [color, material]);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const curvePoints = points.map((p) => new Vector3(p[0], p[1], p[2]));
    const curve = new CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5);
    const radius = BASE_RADIUS * clamp(width, 0.5, 2);
    const tubularSegments = Math.max(2, points.length * 2);
    return new TubeGeometry(curve, tubularSegments, radius, RADIAL_SEGMENTS, false);
  }, [points, width]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

  return <mesh geometry={geometry} material={material} />;
};

export default TrailLine;