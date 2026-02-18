import { Line } from "@react-three/drei";

const AXIS_LENGTH = 10000;

const Axes: React.FC = () => {
  return (
    <group>
      {/* Eje X - Rojo (en Three.js esto es el eje Y físico) */}
      <Line
        points={[
          [-AXIS_LENGTH, 0, 0],
          [AXIS_LENGTH, 0, 0],
        ]}
        color="red"
        lineWidth={1}
      />

      {/* Eje Y - Verde (en Three.js esto es el eje Z físico) */}
      <Line
        points={[
          [0, -AXIS_LENGTH, 0],
          [0, AXIS_LENGTH, 0],
        ]}
        color="green"
        lineWidth={1}
      />

      {/* Eje Z - Azul (en Three.js esto es el eje X físico) */}
      <Line
        points={[
          [0, 0, -AXIS_LENGTH],
          [0, 0, AXIS_LENGTH],
        ]}
        color="blue"
        lineWidth={1}
      />
    </group>
  );
};

export default Axes;
