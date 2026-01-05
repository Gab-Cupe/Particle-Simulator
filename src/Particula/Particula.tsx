import { forwardRef } from "react";
import { Mesh } from "three";

interface Props {
  posicion: [number, number, number];
  color?: string;
}

const Particula = forwardRef<Mesh, Props>(
  ({ posicion, color = "#00ff88" }, ref) => {
    return (
      <mesh ref={ref} position={posicion}>
        <sphereGeometry args={[0.5, 32, 32]} />
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
