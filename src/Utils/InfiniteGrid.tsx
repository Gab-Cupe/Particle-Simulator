import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, Mesh, ShaderMaterial, Vector2 } from "three";

interface InfiniteGridProps {
  showGrid: boolean;
  size?: number;
  cellSize?: number;
  majorCellSize?: number;
  opacity?: number;
}

const InfiniteGrid: React.FC<InfiniteGridProps> = ({
  showGrid,
  size = 2000,
  cellSize = 1,
  majorCellSize = 10,
  opacity = 0.5,
}) => {
  const meshRef = useRef<Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(camera.position.x, -0.001, camera.position.z);
    }
    material.uniforms.uFocusPos.value.set(camera.position.x, camera.position.z);
  });

  const material = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uCellSize: { value: cellSize },
        uMajorCellSize: { value: majorCellSize },
        // Adjust grid colors here.
        uMinorColor: { value: new Color("#4a505f") },
        uMajorColor: { value: new Color("#6a7284") },
        uOpacity: { value: opacity },
        uShowGrid: { value: showGrid ? 1 : 0 },
        uFocusPos: { value: new Vector2(0, 0) },
        uFocusRadius: { value: 45.0 },
        uFocusFeather: { value: 35.0 },
        uFocusBoost: { value: 0.65 },
      },
      vertexShader: `
        varying vec3 vWorldPos;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uCellSize;
        uniform float uMajorCellSize;
        uniform vec3 uMinorColor;
        uniform vec3 uMajorColor;
        uniform float uOpacity;
        uniform float uShowGrid;
        uniform vec2 uFocusPos;
        uniform float uFocusRadius;
        uniform float uFocusFeather;
        uniform float uFocusBoost;

        varying vec3 vWorldPos;

        float gridLine(vec2 coord, float size) {
          vec2 grid = abs(fract(coord / size - 0.5) - 0.5) / fwidth(coord / size);
          float line = min(grid.x, grid.y);
          return 1.0 - clamp(line, 0.0, 1.0);
        }

        void main() {
          vec2 world = vWorldPos.xz;
          vec3 color = vec3(0.0);
          float alpha = 0.0;

          if (uShowGrid > 0.5) {
            float minor = gridLine(world, uCellSize);
            float major = gridLine(world, uMajorCellSize);
            color += minor * uMinorColor;
            color += major * uMajorColor;
            alpha = max(alpha, max(minor, major) * uOpacity);
          }

          float dist = length(world - uFocusPos);
          float focus = 1.0 - smoothstep(uFocusRadius, uFocusRadius + uFocusFeather, dist);
          alpha *= focus;
          color = mix(color * 0.25, color * (1.0 + uFocusBoost), focus);

          if (alpha < 0.01) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, []);

  useEffect(() => {
    material.uniforms.uCellSize.value = cellSize;
    material.uniforms.uMajorCellSize.value = majorCellSize;
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uShowGrid.value = showGrid ? 1 : 0;
  }, [cellSize, majorCellSize, material, opacity, showGrid]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  if (!showGrid) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default InfiniteGrid;