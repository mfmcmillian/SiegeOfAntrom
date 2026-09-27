"""Renders the 512x512 HUD icons from the exported unit bodies and building pieces.

  blender -b --python tools/render-icons.py -- [--only unit-melee,building-temple-alien]

tools/icons.json maps each icon file stem (as src/ui.tsx builds it:
icon-unit-<role><suffix>, icon-building-<kind><suffix>, suffix '' | -alien | -bio)
to a glTF under models/. Units are framed as a bust (shoulders up) in
combat_idle; buildings are framed whole from the front-right. Workbench render,
textured, over the faction's dark background; written to images/icons/<stem>.jpg.
"""
import bpy, os, sys, json
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = set(args[args.index('--only') + 1].split(',')) if '--only' in args else None
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MANIFEST = json.load(open(os.path.join(ROOT, 'tools', 'icons.json')))
OUT = os.path.join(ROOT, 'images', 'icons')

BACKGROUNDS = {'': (0.012, 0.018, 0.035), '-alien': (0.012, 0.03, 0.016), '-bio': (0.03, 0.01, 0.018)}


def bounds(meshes):
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def render(stem, src, kind, suffix):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, src))
    objs = list(bpy.data.objects)
    meshes = [o for o in objs if o.type == 'MESH']
    # Workbench's TEXTURE colour reads each material's *active* image node; make that the atlas.
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        images = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image is not None]
        base = next((n for n in images if any(l.to_socket.name == 'Base Color' for l in mat.node_tree.links if l.from_node == n)), None)
        if base or images:
            mat.node_tree.nodes.active = base or images[0]
    arm = next((o for o in objs if o.type == 'ARMATURE'), None)
    action = bpy.data.actions.get('combat_idle')
    if arm is not None and action is not None:
        if arm.animation_data is None:
            arm.animation_data_create()
        arm.animation_data.action = action
        if hasattr(arm.animation_data, 'action_slot') and len(getattr(action, 'slots', [])):
            arm.animation_data.action_slot = action.slots[0]
        start, end = action.frame_range
        bpy.context.scene.frame_set(int(start + (end - start) * 0.4))
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    height = hi.z - lo.z
    width = max(hi.x - lo.x, hi.y - lo.y)
    scene = bpy.context.scene
    cam_d = bpy.data.cameras.new('icon-cam')
    cam_d.type = 'ORTHO'
    if kind == 'unit' and arm is not None:
        # Bust: centre on the chest, frame the top ~45% of the body.
        # Bust: hang the frame off the posed head so a crouched combat idle stays centred.
        head = arm.pose.bones.get('Head') if arm is not None else None
        top = (arm.matrix_world @ head.head) if head is not None else Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, hi.z - height * 0.12))
        center = top - Vector((0, 0, height * 0.14))
        cam_d.ortho_scale = height * 0.48
        view_dir = Vector((0.45, -1.0, 0.25)).normalized()
    else:
        center = (lo + hi) / 2
        cam_d.ortho_scale = max(height, width) * 1.25
        view_dir = Vector((0.8, -1.0, 0.7)).normalized()
    cam = bpy.data.objects.new('icon-cam', cam_d)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.location = center + view_dir * (max(height, width) * 6 + 2)
    cam.rotation_euler = view_dir.to_track_quat('Z', 'Y').to_euler()
    cam_d.clip_end = max(height, width) * 20 + 10
    scene.render.engine = 'BLENDER_WORKBENCH'
    sh = scene.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'TEXTURE'
    sh.show_backface_culling = False
    sh.show_shadows = False
    sh.show_cavity = False
    sh.studiolight_intensity = 2.0
    scene.view_settings.exposure = 0.4
    world = bpy.data.worlds.new('icon-world')
    world.color = BACKGROUNDS[suffix]
    scene.world = world
    sh.background_type = 'WORLD'
    scene.render.film_transparent = False
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 90
    scene.view_settings.view_transform = 'Standard'
    scene.render.filepath = os.path.join(OUT, stem + '.jpg')
    bpy.ops.render.render(write_still=True)
    print(f'icon {stem} <- {src}')


os.makedirs(OUT, exist_ok=True)
for kind in ('unit', 'building'):
    for suffix, entries in MANIFEST[kind + 's'].items():
        for name, src in entries.items():
            stem = f'icon-{kind}-{name}{suffix}'
            if ONLY and stem[len('icon-'):] not in ONLY:
                continue
            render(stem, src, kind, suffix)
