import {
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  Box3,
  Vector3,
  Group,
} from "three";
import { loadGlb, disposeModel } from "./glb.js";

// One short-lived renderer at a time, never a WebGL canvas per library row.
export async function renderModelThumbnail(file) {
  let model, renderer;
  try {
    model = await loadGlb(file, { allowFlat: true });
    renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(192, 192);
    renderer.setPixelRatio(1);
    const scene = new Scene();
    scene.background = new Color("#e9eee3");
    scene.add(new HemisphereLight(0xffffff, 0x526344, 3));
    const light = new DirectionalLight(0xffffff, 3);
    light.position.set(3, 6, 4);
    scene.add(light);
    const box = new Box3().setFromObject(model.scene),
      size = box.getSize(new Vector3()),
      centre = box.getCenter(new Vector3());
    const root = new Group();
    root.scale.setScalar(1 / Math.max(...size.toArray()));
    model.scene.position.sub(centre);
    root.add(model.scene);
    scene.add(root);
    const camera = new PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(1.6, 1.1, 2.2);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  } finally {
    disposeModel(model);
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}

let queue = Promise.resolve();
// Thumbnails are optional: failure must never block assignment/import.
export function mountAssetThumbnail(
  parent,
  { name, source, model = true, url },
) {
  const frame = document.createElement("div");
  frame.className = "asset-thumbnail";
  frame.textContent = model ? "3D" : "Image";
  frame.setAttribute("aria-label", `Preview: ${name}`);
  parent.prepend(frame);
  const image = document.createElement("img");
  image.alt = name;
  image.width = image.height = 96;
  image.onload = () => {
    if (frame.isConnected) frame.replaceChildren(image);
  };
  image.onerror = () => {
    frame.textContent = "No preview";
  };
  if (url) {
    image.loading = "lazy";
    image.src = url;
    frame.append(image);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    queue = queue.then(async () => {
      if (!frame.isConnected) return;
      let objectUrl;
      try {
        const file = await source();
        if (!frame.isConnected) return;
        if (model) image.src = await renderModelThumbnail(file);
        else {
          objectUrl = URL.createObjectURL(file);
          image.src = objectUrl;
          await image.decode();
          if (frame.isConnected) frame.replaceChildren(image);
        }
      } catch {
        frame.textContent = "No preview";
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    });
  });
  observer.observe(frame);
  // Remove observer references when a list is refreshed or deleted.
  const cleanup = new MutationObserver(() => {
    if (!frame.isConnected) {
      observer.disconnect();
      cleanup.disconnect();
    }
  });
  cleanup.observe(document.body, { childList: true, subtree: true });
}
