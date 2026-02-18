import { useMemo } from "react";
import { Vector3, ArrowHelper } from "three";
import { evaluarFormula } from "../Particula/Movimiento";

interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

interface ForceData {
  id: number;
  vec: [string, string, string];
}

interface ForceArrowProps {
  f: ForceData;
  liveData: LiveData;
}

const ForceArrow: React.FC<ForceArrowProps> = ({ f, liveData }) => {
  const fx = evaluarFormula(
    f.vec[0],
    liveData.t,
    liveData.pos[0],
    liveData.pos[1],
    liveData.pos[2]
  );
  const fy = evaluarFormula(
    f.vec[1],
    liveData.t,
    liveData.pos[0],
    liveData.pos[1],
    liveData.pos[2]
  );
  const fz = evaluarFormula(
    f.vec[2],
    liveData.t,
    liveData.pos[0],
    liveData.pos[1],
    liveData.pos[2]
  );

  const mag = Math.sqrt(fx ** 2 + fy ** 2 + fz ** 2);
  const dir = useMemo(() => new Vector3(), []);
  const origin = useMemo(() => new Vector3(), []);

  if (mag < 0.01) return null;

  dir.set(fy, fz, fx).normalize();
  origin.set(liveData.pos[1], liveData.pos[2], liveData.pos[0]);

  return (
    <primitive
      object={new ArrowHelper(dir, origin, mag * 0.2, 0xffff00)}
      onUpdate={(self: any) => self.setDirection(dir)}
    />
  );
};

export default ForceArrow;
