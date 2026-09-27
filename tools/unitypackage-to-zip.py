"""Repacks a Synty .unitypackage as a plain zip the exporters already read.

  python tools/unitypackage-to-zip.py POLYGON_ElvenRealm_Unity_2022_3_v1_6_2.unitypackage [more...]

A .unitypackage is a gzipped tar of <guid>/asset + <guid>/pathname entries.
Every .fbx and .png under a Models/, Meshes/, Textures/ or Materials/ folder
(plus Sidekick .fbx/.png anywhere) is written into ~/Downloads/<stem>.zip under
its Unity path, so export-realm-kit.py / export-enemy-bodies.py can name the
zip as the `pack` and find members by basename exactly like the SourceFiles zips.
"""
import os, sys, tarfile, zipfile

DOWNLOADS = os.path.join(os.path.expanduser('~'), 'Downloads')
KEEP_EXT = ('.fbx', '.png')
KEEP_DIRS = ('/models/', '/meshes/', '/textures/', '/materials/', '/fbx/', '/sidekick')


def repack(package):
    src = package if os.path.isabs(package) else os.path.join(DOWNLOADS, package)
    stem = os.path.basename(package).replace('.unitypackage', '')
    out = os.path.join(DOWNLOADS, stem + '.zip')
    if os.path.exists(out):
        print(f'{out} exists, skipping')
        return out
    # Pass 1: which guids are wanted (pathname entries usually precede assets, but not always).
    wanted = {}
    with tarfile.open(src, 'r|gz') as tar:
        for entry in tar:
            parts = entry.name.split('/')
            if len(parts) == 2 and parts[1] == 'pathname':
                path = tar.extractfile(entry).read().decode('utf-8', 'replace').split('\n')[0]
                lower = path.lower()
                if lower.endswith(KEEP_EXT) and any(d in lower for d in KEEP_DIRS):
                    wanted[parts[0]] = path
    # Pass 2: copy the assets out.
    count = 0
    with tarfile.open(src, 'r|gz') as tar, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for entry in tar:
            parts = entry.name.split('/')
            if len(parts) == 2 and parts[1] == 'asset' and parts[0] in wanted:
                z.writestr(wanted[parts[0]], tar.extractfile(entry).read())
                count += 1
    print(f'{out}: {count} files')
    return out


if __name__ == '__main__':
    for p in sys.argv[1:]:
        repack(p)
