import { forwardRef } from "react";
import { Mesh } from "three";

interface Props {
  posicion: [number, number, number];
  color?: string;
  radius?: number;
}

const Particula = forwardRef<Mesh, Props>(
  ({ posicion, color = "#00ff88", radius = 0.5 }, ref) => {
    return (
      <mesh ref={ref} position={posicion}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    );
  }
);

export default Particula;
