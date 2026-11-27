# Forest pack source

`forest_pack.glb` is the original user-provided file, copied byte-for-byte from
GitHub blob `e64e6c77cbbea0705fa7c0fedf2bf9a99758c4aa`.
Its embedded metadata declares:

- **Author:** Ragat Vdoo Kaf — https://sketchfab.com/mae_bul_01
- **Title:** low poly forest pack, low poly environment pack
- **Source:** https://sketchfab.com/3d-models/low-poly-forest-pack-low-poly-environment-pack-47b2cb567d1b437fb86d2897353079ab
- **License:** CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/

Attribution: Forest Pack by Ragat Vdoo Kaf, CC BY 4.0. Split, re-centred and
texture-resized for WonderLab. Preserve this credit/source/license when
redistributing the original or derivatives and include it in client deliverables.
The source's license metadata is preserved; this is not an independent rights audit.

The whole pack has 54 authored object groups, 69 mesh primitives, and 9,388
vertices. It is not intended to be repeated as one tree. Individual generated
assets are in `public/packs/forest-v1`, with source names, counts, hashes and
attribution in `src/assets/forest-catalog.json`.

Rebuild (from repository root):

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-assets.txt
.venv/bin/python scripts/prepare-forest-pack.py
```

The script is intentionally specific to the reviewed source hash/hierarchy.
It retains trunk+leaf child groups and original axis transforms, grounds and
centres individual models, prunes unused geometry/materials/textures, tightly
packs accessors, reduces small indices to uint16, and downsizes embedded PNG
atlases from 1024 to 512 pixels. Alpha is retained. Geometry is not decimated.
`--texture-size 1024` retains atlas resolution if required (larger downloads).
Rebuild + commit all outputs/catalog together; checksums are enforced at import.
