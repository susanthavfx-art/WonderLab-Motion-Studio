"""Rebuild curated standalone assets from the user's forest pack.
Install scripts/requirements-assets.txt in a venv; run from repo root.
No decimation: preserve geometry/normals/UVs, prune unrelated resources,
pack accessor bytes, reduce small indices to uint16, resize PNG atlases.
"""
import argparse
import copy
import hashlib
import io
import json
import math
from pathlib import Path
import re
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = 'e64e6c77cbbea0705fa7c0fedf2bf9a99758c4aa'  # Git blob SHA of inspected source
AUTHOR = 'Ragat Vdoo Kaf'
LICENSE = 'CC-BY-4.0'
CREDIT = 'Forest Pack by Ragat Vdoo Kaf, CC BY 4.0. Split, re-centred and texture-resized for WonderLab.'

def pack_glb(doc, binary):
    raw = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    raw += b' ' * (-len(raw) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return (struct.pack('<III', 0x46546c67, 2, 28 + len(raw) + len(binary))
            + struct.pack('<II', len(raw), 0x4e4f534a) + raw
            + struct.pack('<II', len(binary), 0x004e4942) + binary)

def mul(a, b):
    return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]

IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--texture-size', type=int, default=512, choices=[512,1024])
    args = parser.parse_args()
    credit = CREDIT if args.texture_size == 512 else CREDIT.replace('texture-resized', 'texture-repacked')
    src = ROOT / 'Models/forest_pack.glb'
    blob = src.read_bytes()
    assert hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest() == EXPECTED, 'Source changed; review its hierarchy/license before rebuilding.'
    jlen = struct.unpack_from('<I', blob, 12)[0]
    original = json.loads(blob[20:20+jlen])
    binary = blob[28+jlen:]
    assert not original.get('skins') and not original.get('animations') and not original.get('extensionsUsed')
    roots = original['nodes'][2]['children']
    output = ROOT / 'public/packs/forest-v1'
    output.mkdir(parents=True, exist_ok=True)
    sizes = {5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
    dims = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
    def accessor_bytes(index):
        a=original['accessors'][index]; view=original['bufferViews'][a['bufferView']]
        assert 'sparse' not in a
        width=sizes[a['componentType']]*dims[a['type']]
        at=view.get('byteOffset',0)+a.get('byteOffset',0); stride=view.get('byteStride',width)
        return b''.join(binary[at+i*stride:at+i*stride+width] for i in range(a['count']))
    pngs=[]
    for im in original['images']:
        v=original['bufferViews'][im['bufferView']]
        image=Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]))
        image.thumbnail((args.texture_size,args.texture_size),Image.Resampling.LANCZOS)
        target=io.BytesIO();image.save(target,format='PNG',optimize=True);pngs.append(target.getvalue())
    entries=[]; category_counts={}
    for root in roots:
        source_name=original['nodes'][root]['name']
        if 'Tree_Trunk' in source_name: category='tree';label='Tree'
        elif 'stone' in source_name: category='rock';label='Rock'
        elif 'bush' in source_name: category='bush';label='Bush'
        elif 'log' in source_name or 'stump' in source_name: category='deadwood';label='Log / stump'
        else: category='groundcover';label='Ground cover'
        category_counts[category]=category_counts.get(category,0)+1
        slug=re.sub(r'[^a-z0-9]+','-',source_name.lower()).strip('-')
        doc={'asset':copy.deepcopy(original['asset']),'scene':0,'scenes':[{'nodes':[0]}], 'nodes':[], 'meshes':[], 'materials':[], 'textures':[], 'images':[], 'samplers':[], 'accessors':[], 'bufferViews':[]}
        doc['asset']['generator']='WonderLab forest pack splitter v1'
        doc['asset']['extras']['modifications']=credit
        packed=bytearray();maps={k:{} for k in ['accessors','materials','textures','images','samplers','meshes','nodes']}
        bounds=[[],[],[]];mesh_count=vertices=triangles=0
        def add_view(data,target=None):
            packed.extend(b'\0'*(-len(packed)%4));idx=len(doc['bufferViews']);v={'buffer':0,'byteOffset':len(packed),'byteLength':len(data)}
            if target:v['target']=target
            doc['bufferViews'].append(v);packed.extend(data);return idx
        def remap(kind,index):
            if index in maps[kind]:return maps[kind][index]
            out=copy.deepcopy(original[kind][index]);idx=len(doc[kind]);maps[kind][index]=idx;doc[kind].append(out)
            if kind=='accessors':
                data=accessor_bytes(index)
                target=original['bufferViews'][out['bufferView']].get('target')
                if out['type']=='SCALAR' and out['componentType']==5125:
                    values=struct.unpack('<'+'I'*out['count'],data)
                    if max(values,default=0)<65536:data=struct.pack('<'+'H'*len(values),*values);out['componentType']=5123
                out['bufferView']=add_view(data,target);out.pop('byteOffset',None)
            elif kind=='images':out['bufferView']=add_view(pngs[index]);out['mimeType']='image/png'
            elif kind=='textures':
                out['source']=remap('images',out['source'])
                if 'sampler' in out:out['sampler']=remap('samplers',out['sampler'])
            elif kind=='materials':
                def textures(v):
                    if isinstance(v,dict):
                        for key,val in v.items():
                            if key.endswith('Texture') and isinstance(val,dict):val['index']=remap('textures',val['index'])
                            else:textures(val)
                    elif isinstance(v,list):
                        for val in v:textures(val)
                textures(out)
            elif kind=='meshes':
                for p in out['primitives']:
                    p['attributes']={k:remap('accessors',v) for k,v in p['attributes'].items()}
                    if 'indices' in p:p['indices']=remap('accessors',p['indices'])
                    if 'material' in p:p['material']=remap('materials',p['material'])
            return idx
        def add_node(index,parent_world):
            nonlocal mesh_count,vertices,triangles
            node=copy.deepcopy(original['nodes'][index]);assert not any(k in node for k in ['translation','rotation','scale'])
            world=mul(parent_world,node.get('matrix',IDENTITY))
            if 'mesh' in node:
                source_mesh=original['meshes'][node['mesh']]
                mesh_count+=len(source_mesh['primitives'])
                for primitive in source_mesh['primitives']:
                    a=primitive['attributes']['POSITION'];accessor=original['accessors'][a]
                    assert accessor['componentType']==5126
                    vertices+=accessor['count'];triangles+=original['accessors'][primitive['indices']]['count']//3
                    points=struct.iter_unpack('<fff',accessor_bytes(a))
                    for point in points:
                        p=(*point,1)
                        for axis in range(3):bounds[axis].append(sum(world[k*4+axis]*p[k] for k in range(4)))
                node['mesh']=remap('meshes',node['mesh'])
            idx=len(doc['nodes']);doc['nodes'].append(node)
            children=node.get('children',[])
            if children:node['children']=[add_node(child,world) for child in children]
            return idx
        # Retain the source axis-conversion ancestors and each trunk+leaves subtree.
        doc['nodes'].append({'name':'WonderLab grounded origin','children':[1]})
        doc['nodes'].append(copy.deepcopy(original['nodes'][0]));doc['nodes'][1]['children']=[2]
        doc['nodes'].append(copy.deepcopy(original['nodes'][1]));doc['nodes'][2]['children']=[3]
        doc['nodes'].append(copy.deepcopy(original['nodes'][2]));doc['nodes'][3]['children']=[4]
        ancestor=mul(original['nodes'][0].get('matrix',IDENTITY),original['nodes'][2].get('matrix',IDENTITY))
        assert add_node(root,ancestor)==4
        assert all(bounds) and all(math.isfinite(v) for axis in bounds for v in axis)
        lo=[min(a) for a in bounds];hi=[max(a) for a in bounds]
        doc['nodes'][0]['translation']=[-(lo[0]+hi[0])/2,-lo[1],-(lo[2]+hi[2])/2]
        doc['buffers']=[{'byteLength':len(packed)}]
        data=pack_glb(doc,bytes(packed));filename=slug+'.glb';(output/filename).write_bytes(data)
        entries.append({'id':slug,'name':source_name,'category':category,'suggestedSlot':'tree' if category=='tree' else 'rock' if category in ['rock','deadwood'] else 'bush','file':filename,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'meshes':mesh_count,'vertices':vertices,'triangles':triangles})
    catalog={'id':'forest-v1','title':'Forest Pack','author':AUTHOR,'license':LICENSE,'licenseUrl':'https://creativecommons.org/licenses/by/4.0/','source':original['asset']['extras']['source'],'authorUrl':'https://sketchfab.com/mae_bul_01','attribution':credit,'sourceGitBlob':EXPECTED,'sourceSha256':hashlib.sha256(blob).hexdigest(),'textureSize':args.texture_size,'changes':'Split 54 authored groups, prune unused data, tightly pack accessors, uint16 indices where possible, centre/floor pivots, resize PNG atlases; no decimation.','assets':entries}
    (ROOT/'src/assets/forest-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
    (output/'CREDITS.txt').write_text(f"{credit}\nAuthor: {catalog['authorUrl']}\nSource: {catalog['source']}\nLicense declared in source metadata: {LICENSE}\n{catalog['licenseUrl']}\n\nModified for WonderLab: 54 authored groups split, unused resources pruned,\ngeometry/normals/UVs preserved (no decimation), small indices stored as uint16,\npivots centred/grounded, embedded PNG atlases exported at {args.texture_size}px with alpha.\n\nPreserve author/source/license/modification credit with redistributed models\nand client deliverables. No endorsement is implied.\n")
    print(json.dumps({'assets':len(entries),'categories':category_counts,'sourceVertices':sum(e['vertices'] for e in entries),'totalStandaloneBytes':sum(e['bytes'] for e in entries),'maxMeshes':max(e['meshes'] for e in entries),'maxVertices':max(e['vertices'] for e in entries)},indent=2))

if __name__=='__main__':main()
