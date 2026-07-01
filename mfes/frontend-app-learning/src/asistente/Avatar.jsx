import React, {
  useEffect, useRef, useMemo,
} from 'react';
import { useGLTF, useFBX, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const arkitMouthMuscles = [
  'jawOpen', 'mouthFunnel', 'mouthPucker', 'mouthClose',
  'mouthRollLower', 'mouthSmileLeft', 'mouthSmileRight',
  'eyeBlinkLeft', 'eyeBlinkRight',
];

const arkitMapping = {
  A: { jawOpen: 0.0 },
  B: { jawOpen: 0.1 },
  C: { jawOpen: 0.2, mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
  D: { jawOpen: 0.4 },
  E: { jawOpen: 0.1, mouthFunnel: 0.7 },
  F: { jawOpen: 0.1, mouthPucker: 0.8 },
  G: { jawOpen: 0.1, mouthRollLower: 0.6 },
  H: { jawOpen: 0.2 },
  X: { jawOpen: 0.0 },
};

export default function Avatar({
  currentAnimation = 'Idle',
  audioRef,
  lipSyncData,
  avatarPath = '/avatar.glb',
  ...props
}) {
  const group = useRef();
  const { scene, nodes } = useGLTF(avatarPath);
  const { animations: idleAnim } = useFBX(`${process.env.PUBLIC_PATH || '/'}animacion.fbx`);

  const clips = useMemo(() => {
    if (!idleAnim || !idleAnim[0]) { return []; }
    idleAnim[0].name = 'Idle';
    return [idleAnim[0]];
  }, [idleAnim]);

  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        // eslint-disable-next-line no-param-reassign
        child.frustumCulled = false;
        if (child.material) {
          // eslint-disable-next-line no-param-reassign
          child.material.metalness = 0.1;
          // eslint-disable-next-line no-param-reassign
          child.material.roughness = 0.7;
        }
        const nodeName = child.name.toLowerCase();
        const materialName = child.material?.name?.toLowerCase() || '';
        if (nodeName.includes('cornea') || materialName.includes('cornea')) {
          // eslint-disable-next-line no-param-reassign
          child.visible = false;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    if (actions?.[currentAnimation]) {
      const action = actions[currentAnimation];
      action.reset().fadeIn(0.5).play();
      return () => action.fadeOut(0.5);
    }
    return undefined;
  }, [actions, currentAnimation]);

  const targetInfluences = useRef({});
  const blinkData = useRef({ nextBlink: 0, blinkEndTime: 0 });
  const faceMeshesRef = useRef([]);

  // Recolectar TODOS los meshes con morph targets (boca en Wolf3D_Head, ojos en EyeLeft/EyeRight, etc.)
  useEffect(() => {
    if (!nodes) { return; }
    const meshes = Object.values(nodes).filter(
      (n) => n.isMesh && n.morphTargetDictionary
        && Object.keys(n.morphTargetDictionary).length > 0,
    );
    faceMeshesRef.current = meshes;
  }, [nodes]);

  useFrame((state, delta) => {
    const faceMeshes = faceMeshesRef.current;
    if (!faceMeshes.length) { return; }

    arkitMouthMuscles.forEach((m) => { targetInfluences.current[m] = 0; });

    if (audioRef?.current && lipSyncData?.length && !audioRef.current.paused) {
      const { currentTime } = audioRef.current;
      const activeViseme = lipSyncData.find(
        (cue) => currentTime >= cue.start && currentTime <= cue.end,
      );
      const poses = (activeViseme && arkitMapping[activeViseme.value])
        ? arkitMapping[activeViseme.value]
        : arkitMapping.X;
      Object.keys(poses).forEach((m) => { targetInfluences.current[m] = poses[m]; });
    }

    const time = state.clock.elapsedTime;
    if (time > blinkData.current.nextBlink) {
      blinkData.current.blinkEndTime = time + 0.15;
      blinkData.current.nextBlink = time + THREE.MathUtils.randFloat(2, 6);
    }
    if (time < blinkData.current.blinkEndTime) {
      targetInfluences.current.eyeBlinkLeft = 1;
      targetInfluences.current.eyeBlinkRight = 1;
    }

    // Aplicar a todos los meshes faciales: cada uno tiene su propia geometría
    faceMeshes.forEach((mesh) => {
      arkitMouthMuscles.forEach((muscle) => {
        const idx = mesh.morphTargetDictionary[muscle];
        if (idx !== undefined) {
          // eslint-disable-next-line no-param-reassign
          mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[idx],
            targetInfluences.current[muscle] || 0,
            delta * 15,
          );
        }
      });
    });
  });

  if (!scene) { return null; }
  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}
