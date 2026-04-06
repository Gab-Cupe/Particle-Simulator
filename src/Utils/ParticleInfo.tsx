import type { PData } from "../Particula/Movimiento";

interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

interface ParticleInfoProps {
  p: PData;
  liveData: LiveData;
  showInfo: boolean;
  gravity: boolean;
  friction: number;
}

// Las etiquetas 3D han sido reemplazadas por el panel InfoPanel en la GUI
const ParticleInfo: React.FC<ParticleInfoProps> = () => {
  // Este componente ya no renderiza etiquetas 3D
  // La información ahora se muestra en el panel lateral InfoPanel
  return null;
};

export default ParticleInfo;
