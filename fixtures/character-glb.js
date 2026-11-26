// Tiny, self-authored skinned block with four embedded clips. No third-party assets.
export function packGlb(json, binary = new Uint8Array()) {
  const raw = new TextEncoder().encode(JSON.stringify(json)),
    jlen = Math.ceil(raw.length / 4) * 4,
    blen = Math.ceil(binary.byteLength / 4) * 4;
  const out = new ArrayBuffer(12 + 8 + jlen + (blen ? 8 + blen : 0)),
    v = new DataView(out),
    bytes = new Uint8Array(out);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, out.byteLength, true);
  v.setUint32(12, jlen, true);
  v.setUint32(16, 0x4e4f534a, true);
  bytes.fill(32, 20, 20 + jlen);
  bytes.set(raw, 20);
  if (blen) {
    v.setUint32(20 + jlen, blen, true);
    v.setUint32(24 + jlen, 0x004e4942, true);
    bytes.set(binary, 28 + jlen);
  }
  return out;
}
export function characterGlb({
  animated = true,
  texture = false,
  flat = false,
} = {}) {
  const json = {
    asset: { version: "2.0", generator: "WonderLab test fixture" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: "Character", children: [1, 2] },
      { name: "Bone" },
      { name: "Body", mesh: 0, skin: 0 },
    ],
    skins: [{ joints: [1], skeleton: 1 }],
    meshes: [],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [0.7, 0.2, 0.3, 1],
          metallicFactor: 0,
          roughnessFactor: 0.8,
        },
      },
    ],
    buffers: [{ byteLength: 0 }],
    bufferViews: [],
    accessors: [],
  };
  const chunks = [];
  let length = 0;
  function add(array, type, componentType, min, max) {
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      length += pad;
    }
    const index = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: length,
      byteLength: array.byteLength,
    });
    chunks.push(new Uint8Array(array.buffer));
    length += array.byteLength;
    const i = json.accessors.length;
    json.accessors.push({
      bufferView: index,
      componentType,
      count: array.length / { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type],
      type,
      ...(min ? { min, max } : {}),
    });
    return i;
  }
  const p = add(
    new Float32Array(
      [
        -0.3, 0, -0.3, 0.3, 0, -0.3, 0.3, 2, -0.3, -0.3, 2, -0.3, -0.3, 0, 0.3,
        0.3, 0, 0.3, 0.3, 2, 0.3, -0.3, 2, 0.3,
      ].map((v, i) => (flat && i % 3 === 1 ? 0 : v)),
    ),
    "VEC3",
    5126,
    [-0.3, 0, -0.3],
    [0.3, flat ? 0 : 2, 0.3],
  );
  const indices = add(
    new Uint16Array([
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0,
      4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
    ]),
    "SCALAR",
    5123,
  );
  const joints = add(new Uint16Array(32), "VEC4", 5123),
    weights = add(
      new Float32Array(
        Array.from({ length: 32 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
      ),
      "VEC4",
      5126,
    );
  const attributes = { POSITION: p, JOINTS_0: joints, WEIGHTS_0: weights };
  if (texture) {
    attributes.TEXCOORD_0 = add(
      new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]),
      "VEC2",
      5126,
    );
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    );
    if (texture === "invalid") png[0] = 0;
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      length += pad;
    }
    json.images = [
      { bufferView: json.bufferViews.length, mimeType: "image/png" },
    ];
    json.bufferViews.push({
      buffer: 0,
      byteOffset: length,
      byteLength: png.length,
    });
    chunks.push(png);
    length += png.length;
    json.textures = [{ source: 0 }];
    json.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  }
  json.meshes = [{ primitives: [{ attributes, indices, material: 0 }] }];
  if (animated) {
    const times = add(new Float32Array([0, 0.5, 1]), "SCALAR", 5126, [0], [1]);
    json.animations = ["Idle", "Run", "Jump", "Duck"].map((name, i) => {
      const angle = [0.05, 0.5, 0.9, 0.2][i];
      const rotation = add(
        new Float32Array([
          0,
          0,
          0,
          1,
          0,
          0,
          Math.sin(angle / 2),
          Math.cos(angle / 2),
          0,
          0,
          0,
          1,
        ]),
        "VEC4",
        5126,
      );
      return {
        name,
        samplers: [{ input: times, output: rotation, interpolation: "LINEAR" }],
        channels: [{ sampler: 0, target: { node: 1, path: "rotation" } }],
      };
    });
  }
  const binary = new Uint8Array(length);
  let o = 0;
  for (const chunk of chunks) {
    binary.set(chunk, o);
    o += chunk.length;
  }
  json.buffers[0].byteLength = length;
  return packGlb(json, binary);
}
