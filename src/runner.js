import * as T from "three";
// Renderer only: all gameplay, scoring and timing live in runner-game.js.
export function createRunner(host) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return {
      draw() {},
      setBrand() {},
      error: "WebGL unavailable. Motion diagnostics still work.",
    };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  host.append(renderer.domElement);
  const scene = new T.Scene();
  scene.fog = new T.Fog("#dfe8db", 28, 65);
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
  const track = box(8, 0.2, 65, "#c5d1bf", 0, -0.15, -22);
  const markings = [];
  for (let z = 0; z > -48; z -= 3) {
    for (const x of [-1.1, 1.1])
      markings.push(box(0.035, 0.01, 1.4, "#f8faf3", x, 0, z));
  }
  const rails = [-4.3, 4.3].map((x) =>
    box(0.15, 0.15, 60, "#5b755e", x, 0, -23),
  );
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
  const obstacles = Array.from({ length: 5 }, () => ({
    block: box(1.35, 0.8, 0.8, "#db855d", 0, 0.4, -30),
    bar: box(1.8, 0.25, 0.6, "#658cac", 0, 1.55, -30),
    posts: [
      box(0.12, 1.8, 0.12, "#819588", 0, 0.9, -30),
      box(0.12, 1.8, 0.12, "#819588", 0, 0.9, -30),
    ],
    coin: box(0.42, 0.42, 0.18, "#edc649", 0, 1, -30),
  }));
  let width = 0,
    height = 0;
  return {
    setBrand(brand) {
      body.material.color.set(brand.primary);
      arms.forEach((m) => m.material.color.set(brand.accent));
      rails.forEach((m) => m.material.color.set(brand.accent));
      track.material.color.set(brand.background).multiplyScalar(0.9);
      scene.fog.color.set(brand.background);
      host.style.backgroundColor = brand.background;
    },
    draw(game) {
      const r = host.getBoundingClientRect();
      if (r.width !== width || r.height !== height) {
        width = r.width;
        height = r.height;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      }
      avatar.position.set(game.x, game.height, 0);
      avatar.scale.y = game.squat ? 0.58 : 1;
      avatar.visible = game.lives > 0;
      body.rotation.z = -(game.lane * 2.2 - game.x) * 0.04;
      const phase = game.distance * 2;
      legs.forEach(
        (m, i) =>
          (m.rotation.x =
            Math.sin(phase + i * Math.PI) * Math.min(0.8, game.speed * 0.12)),
      );
      arms.forEach(
        (m, i) =>
          (m.rotation.x =
            Math.sin(phase - i * Math.PI) * Math.min(0.7, game.speed * 0.1)),
      );
      markings.forEach(
        (m, i) =>
          (m.position.z =
            3 - ((Math.floor(i / 2) * 3 + 48 - (game.distance % 48)) % 48)),
      );
      obstacles.forEach((pool, i) => {
        const row = game.course[game.nextRow + i];
        const visible = !!row && row.distance - game.distance < 49;
        pool.block.visible = visible && row.type === "block";
        pool.bar.visible = visible && row.type === "bar";
        pool.posts.forEach((m) => (m.visible = visible && row.type === "bar"));
        pool.coin.visible = visible;
        if (!visible) return;
        const z = game.distance - row.distance;
        pool.block.position.set(row.lane * 2.2, 0.4, z);
        pool.bar.position.set(row.lane * 2.2, 1.55, z);
        pool.posts.forEach((m, j) =>
          m.position.set(row.lane * 2.2 + (j ? 1 : -1) * 0.86, 0.9, z),
        );
        pool.coin.position.set(row.coinLane * 2.2, 1, z);
        pool.coin.rotation.y = game.distance * 0.1;
      });
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
