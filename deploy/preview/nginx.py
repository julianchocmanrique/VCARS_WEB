import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

INCLUDE = 'include /etc/nginx/snippets/vcars-fixed-preview.conf;'
SNIPPET = '''# VCARS isolated preview. Other Viralco paths are untouched.
location = /vcars { return 302 /vcars/; }
location ^~ /vcars/ {
    proxy_pass http://127.0.0.1:3014;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
    proxy_buffering off;
    client_max_body_size 25m;
    # Do not retain private review-link keys in the public web access log.
    access_log off;
}
'''


def add_route(text):
    # Match braces outside quoted strings and comments, including nested locations.
    stack, blocks, quote, comment, escaped = [], [], None, False, False
    for i, ch in enumerate(text):
        if comment:
            if ch == '\n':
                comment = False
            continue
        if escaped:
            escaped = False
            continue
        if ch == '\\':
            escaped = True
            continue
        if quote:
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch == '#':
            comment = True
        elif ch == '{':
            stack.append(i)
        elif ch == '}':
            if not stack:
                raise ValueError('Unbalanced nginx configuration')
            opening = stack.pop()
            prefix = text[:opening].rstrip()
            if not stack and re.search(r'\bserver$', prefix):
                blocks.append((opening, i))
    if stack or quote:
        raise ValueError('Unbalanced nginx configuration')
    targets = [(a, b) for a, b in blocks if
               re.search(r'server_name\s+www\.viralcoproducciones\.com\s*;', text[a:b]) and
               re.search(r'listen\s+[^;]*443[^;]*ssl', text[a:b])]
    if len(targets) != 1:
        raise ValueError('Expected exactly one existing HTTPS www.viralcoproducciones.com server')
    a, b = targets[0]
    if INCLUDE in text[a:b]:
        return text
    if re.search(r'location[^\n]*\/vcars', text[a:b]):
        raise ValueError('Existing VCARS route requires manual inspection; refusing to overwrite')
    return text[:b] + '  ' + INCLUDE + '\n' + text[b:]


def install():
    config = Path('/etc/nginx/sites-enabled/viralcoproducciones.conf').resolve(strict=True)
    snippet = Path('/etc/nginx/snippets/vcars-fixed-preview.conf')
    backup = Path(sys.argv[1])
    backup.mkdir(mode=0o700, parents=True, exist_ok=True)
    original = config.read_text()
    modified = add_route(original)
    if snippet.exists() and snippet.read_text() != SNIPPET:
        raise ValueError('Preview snippet differs; refusing to replace unknown changes')
    if modified == original and snippet.exists():
        subprocess.run(['nginx', '-t'], check=True)
        print('Existing VCARS route preserved')
        return
    existed = snippet.exists()
    shutil.copy2(config, backup / 'viralco-nginx.conf')
    try:
        snippet.write_text(SNIPPET)
        snippet.chmod(0o644)
        config.write_text(modified)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except Exception:
        shutil.copy2(backup / 'viralco-nginx.conf', config)
        if not existed:
            snippet.unlink(missing_ok=True)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise
    print('Added VCARS locations only; original Viralco configuration backed up')


if __name__ == '__main__':
    install()
