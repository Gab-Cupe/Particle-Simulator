import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

interface AnimationState {
  startPos: Vector3;
  startTarget: Vector3;
  endPos: Vector3;
  endTarget: Vector3;
  startTime: number;
  duration: number;
}

interface SmoothCameraFocusProps {
  target: [number, number, number] | null;
  resetTick: number;
  defaultCamPos: [number, number, number];
  viewPos?: [number, number, number] | null;
  viewTarget?: [number, number, number] | null;
  viewTick?: number;
}

const SmoothCameraFocus: React.FC<SmoothCameraFocusProps> = ({
  target,
  resetTick,
  defaultCamPos,
  viewPos,
  viewTarget,
  viewTick,
}) => {
  const animRef = useRef<AnimationState | null>(null);
  const pendingFocusRef = useRef(false);
  const pendingResetRef = useRef(false);
  const pendingViewRef = useRef(false);

  const launchAnim = (
    state: any,
    opts: {
      type: "reset" | "focus" | "view";
      target?: [number, number, number];
      pos?: [number, number, number];
    }
  ) => {
    const cam = state.camera;
    const controls = (state.controls as any) || null;
    const currTarget = controls?.target || new Vector3();
    const currPos = cam.position.clone();
    const startPos = currPos.clone();
    const startTarget = currTarget.clone();
    let endTarget: Vector3, endPos: Vector3;

    if (opts.type === "reset") {
      endTarget = new Vector3(0, 0, 0);
      endPos = new Vector3(...defaultCamPos);
    } else if (opts.type === "view") {
      endTarget = new Vector3(...opts.target!);
      endPos = new Vector3(...opts.pos!);
    } else {
      endTarget = new Vector3(...opts.target!);
      const offset = currPos.clone().sub(currTarget);
      const dir =
        offset.length() > 0.0001
          ? offset.clone().normalize()
          : new Vector3(0, 1, 0);
      endPos = endTarget.clone().add(dir.multiplyScalar(12));
    }

    animRef.current = {
      startPos,
      startTarget,
      endPos,
      endTarget,
      startTime: performance.now(),
      duration: 450,
    };
  };

  useEffect(() => {
    pendingFocusRef.current = !!target;
    animRef.current = null;
  }, [target]);

  const resetTickRef = useRef(resetTick);

  useEffect(() => {
    if (resetTick === resetTickRef.current) return;
    resetTickRef.current = resetTick;
    pendingResetRef.current = true;
    animRef.current = null;
  }, [resetTick]);

  const viewTickRef = useRef(viewTick ?? 0);

  useEffect(() => {
    if (viewTick === undefined) return;
    if (viewTick === viewTickRef.current) return;
    viewTickRef.current = viewTick;
    pendingViewRef.current = true;
    animRef.current = null;
  }, [viewTick]);

  useFrame((state) => {
    if (target && pendingFocusRef.current && !animRef.current) {
      launchAnim(state, { type: "focus", target });
      pendingFocusRef.current = false;
    }
    if (
      pendingResetRef.current &&
      resetTickRef.current === resetTick &&
      !target &&
      !animRef.current
    ) {
      if (resetTick > 0) {
        launchAnim(state, { type: "reset" });
        pendingResetRef.current = false;
      }
    }
    if (pendingViewRef.current && viewPos && viewTarget && !animRef.current) {
      launchAnim(state, { type: "view", pos: viewPos, target: viewTarget });
      pendingViewRef.current = false;
    }
    const anim = animRef.current;
    if (!anim) return;
    const now = performance.now();
    const t = Math.min(1, (now - anim.startTime) / anim.duration);
    state.camera.position.lerpVectors(anim.startPos, anim.endPos, t);
    const newTarget = anim.startTarget.clone().lerp(anim.endTarget, t);
    if ((state.controls as any)?.target)
      (state.controls as any).target.copy(newTarget);
    (state.controls as any)?.update?.();
    if (t >= 1) animRef.current = null;
  });

  return null;
};

export default SmoothCameraFocus;
