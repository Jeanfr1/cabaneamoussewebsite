from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
import json,re,hashlib
from PIL import Image
R=Path(__file__).resolve().parents[1];errors=[];checks=0
def checkref(ref,base):
 global checks
 if not ref or ref.startswith(('#','https:','http:','mailto:','tel:','data:')):return
 p=(base/unquote(urlsplit(ref).path)).resolve();checks+=1
 if not p.is_file():errors.append(str(p))
class Parser(HTMLParser):
 def __init__(self,base):super().__init__();self.base=base
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('src','href'):checkref(v,self.base)
   if k=='style':
    for ref in re.findall(r'url\([\x27\"]?([^\)\x27\"]+)',v):checkref(ref,self.base)
for f in R.rglob('*.html'):Parser(f.parent).feed(f.read_text())
for f in R.rglob('*.css'):
 for ref in re.findall(r'url\([\x27\"]?([^\)\x27\"]+)',f.read_text()):checkref(ref,f.parent)
for f in R.rglob('*.json'):json.loads(f.read_text())
for f in [R/'01-identidade/logo-transparente.png',*list((R/'05-camadas').glob('*.png'))]:
 im=Image.open(f);assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)
manifest=R/'MANIFESTO-SHA256.json'
if manifest.exists():
 for p,h in json.loads(manifest.read_text()).items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==h,p
assert not errors,errors
print(f'PASS: {checks} local references, JSON parsing, genuine alpha, manifest if present.')
