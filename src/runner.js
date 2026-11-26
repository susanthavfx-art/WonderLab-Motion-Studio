import * as T from "three";
// Small input visualizer, not the scored runner template. No game logic depends on webcam internals.
export function createRunner(host) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return {
      draw() {},
      error: "WebGL unavailable. Motion diagnostics still work.",
    };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  host.append(renderer.domElement);
  const scene = new T.Scene();
  scene.fog = new T.Fog("#dfe8db", 14, 48);
  const camera = new T.PerspectiveCamera(45, 1, 0.1, 70);
  camera.position.set(0, 5, 9);
  camera.lookAt(0, 1, -8);
  scene.add(new T.HemisphereLight("#ffffff", "#617b60", 3));
  const light = new T.DirectionalLight("#fff5d8", 3);
  light.position.set(4, 8, 5);
  scene.add(light);
  const mat = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const box = (w, h, d, c, x, y, z) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };
  box(8, 0.2, 65, "#c5d1bf", 0, -0.15, -22);
  const markings = [];
  for (let z = 0; z > -48; z -= 3) {
    for (const x of [-1.1, 1.1])
      markings.push(box(0.035, 0.01, 1.4, "#f8faf3", x, 0, z));
  }
  for (const x of [-4.3, 4.3]) box(0.15, 0.15, 60, "#5b755e", x, 0, -23);
  for (let i = 0; i < 16; i++) {
    const x = (i % 2 ? 1 : -1) * (5 + (i % 3));
    box(0.3, 1.5, 0.3, "#75926f", x, 0.75, -i * 3);
    box(1.6, 2, 1.6, "#a7b797", x, 2, -i * 3);
  }
  const avatar = new T.Group();
  scene.add(avatar);
  const part = (w, h, d, c, x, y, z) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    avatar.add(m);
    return m;
  };
  const body = part(0.58, 0.65, 0.35, "#d6f65c", 0, 1.18, 0);
  part(0.38, 0.38, 0.38, "#304d3d", 0, 1.73, 0);
  const legs = [
    part(0.2, 0.65, 0.22, "#304d3d", -0.18, 0.52, 0),
    part(0.2, 0.65, 0.22, "#304d3d", 0.18, 0.52, 0),
  ];
  const arms = [
    part(0.16, 0.6, 0.2, "#78974c", -0.4, 1.15, 0),
    part(0.16, 0.6, 0.2, "#78974c", 0.4, 1.15, 0),
  ];
  let width = 0,
    height = 0,
    jumpTime = -1,
    phase = 0;
  return {
    draw(dt, a, mode, active) {
      const r = host.getBoundingClientRect();
      if (r.width !== width || r.height !== height) {
        width = r.width;
        height = r.height;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      }
      const speed = active ? (mode === "auto" ? 7 : a.intensity * 9) : 0;
      if (active && a.jump && jumpTime < 0) jumpTime = 0;
      if (active && jumpTime >= 0) {
        jumpTime += dt;
        if (jumpTime > 0.85) jumpTime = -1;
      }
      phase += dt * speed * 2;
      avatar.position.x +=
        (a.lean * 2.2 - avatar.position.x) * Math.min(1, dt * 12);
      avatar.position.y =
        jumpTime >= 0 ? Math.sin((jumpTime / 0.85) * Math.PI) * 1.7 : 0;
      avatar.scale.y = a.squat ? 0.62 : 1;
      body.rotation.z = -a.lean * 0.08;
      legs.forEach(
        (m, i) =>
          (m.rotation.x =
            Math.sin(phase + i * Math.PI) * Math.min(0.8, speed * 0.12)),
      );
      arms.forEach(
        (m, i) =>
          (m.rotation.x =
            Math.sin(phase - i * Math.PI) * Math.min(0.7, speed * 0.1)),
      );
      for (const m of markings) {
        m.position.z += speed * dt;
        if (m.position.z > 3) m.position.z -= 48;
      }
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
