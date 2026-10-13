#!/usr/bin/env bash
set -Eeuo pipefail
exec 9>/opt/vcars-preview/deploy.lock
flock -w 60 9
printf '\nBEFORE\n'; df -B1 /; docker system df
curl -fsS --max-time 20 http://127.0.0.1:3013/vcars/api/backend/health/
python3 - <<'PY'
import json,subprocess,pathlib,re,shutil,time
base=pathlib.Path('/opt/vcars-preview/releases')
current=(base.parent/'current').resolve()
assert current.parent==base and current.is_dir()
run=lambda *args: subprocess.check_output(args,text=True).strip()
ids=run('docker','ps','-aq').splitlines()
containers=json.loads(run('docker','inspect',*ids))
container_before=sorted((c['Id'],c['Image'],c['State']['Running']) for c in containers)
volumes_before=run('docker','volume','ls','-q').splitlines()
used={c['Image'] for c in containers}
mounts=[pathlib.Path(m['Source']).resolve() for c in containers for m in c['Mounts'] if m['Type']=='bind']
releases=sorted([p for p in base.iterdir() if not p.is_symlink() and p.is_dir() and re.fullmatch(r'vcars-preview-[0-9]+-[a-f0-9]+',p.name)],reverse=True)
previous=[p for p in releases if p.name<current.name][:2]
assert len(previous)==2
keep={current.name,*[p.name for p in previous]}
for name in keep:
 for repo in ['vcars-preview-web','vcars-preview-api']:
  run('docker','image','inspect',repo+':'+name)
print('KEEP_RELEASES',sorted(keep),flush=True)
removed_images=0
refs=run('docker','image','ls','--format','{{.Repository}}:{{.Tag}}').splitlines()
for ref in refs:
 repo,tag=ref.rsplit(':',1)
 if repo not in ['vcars-preview-web','vcars-preview-api'] or tag in keep: continue
 if not re.fullmatch(r'vcars-preview-[0-9]+-[a-f0-9]+',tag): continue
 image=json.loads(run('docker','image','inspect',ref))[0]
 if image['Id'] in used: continue
 print('REMOVE_OLD_VCARS_IMAGE',ref,flush=True)
 subprocess.run(['docker','image','rm',ref],check=True,stdout=subprocess.DEVNULL)
 removed_images+=1
removed_dirs=0
for p in releases:
 if p.name in keep or time.time()-p.stat().st_mtime<72*3600: continue
 if any(m==p or p in m.parents for m in mounts): continue
 assert p.parent==base and p.resolve()==p
 print('REMOVE_OLD_VCARS_PACKAGE',p.name,flush=True)
 shutil.rmtree(p)
 removed_dirs+=1
assert (base.parent/'current').resolve()==current
ids_after=run('docker','ps','-aq').splitlines()
after=json.loads(run('docker','inspect',*ids_after))
assert container_before==sorted((c['Id'],c['Image'],c['State']['Running']) for c in after),'Containers changed during cleanup'
assert sorted(volumes_before)==sorted(run('docker','volume','ls','-q').splitlines())
for name in keep:
 for repo in ['vcars-preview-web','vcars-preview-api']: run('docker','image','inspect',repo+':'+name)
print('REMOVED',removed_images,'image tags;',removed_dirs,'old packages. All containers, volumes, active and rollback images retained.',flush=True)
PY
printf '\nAFTER\n'; df -B1 /; docker system df
printf '\nVCARS HEALTH\n'; curl -fsS --max-time 20 http://127.0.0.1:3013/vcars/api/backend/health/
printf '\nPERSISTENT DATA AND BACKUPS PRESERVED\n'; du -sh /opt/vcars-preview/{data,backups,releases}
printf '\nOTHER LARGE LOCATIONS (READ ONLY)\n'; du -x -h --max-depth=1 /opt /var/lib/docker /var/log /root 2>/dev/null | sort -h | tail -18
