import { PlaceholderAvatar } from './PlaceholderAvatar';

// Punto único de montaje del avatar. En la Fase 5 cargará public/models/gabi.glb con useGLTF
// y usará PlaceholderAvatar como respaldo mientras carga o si falla. Ambos leen el mismo rig.
export function Avatar(props: { position: [number, number, number]; reducedMotion: boolean }) {
  return <PlaceholderAvatar {...props} />;
}
