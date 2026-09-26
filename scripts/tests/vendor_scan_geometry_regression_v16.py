import cv2,json,hashlib,time
from pathlib import Path
from vendor_scan_geometry_v16 import prepare,verify,PARAMETERS
root=Path('.local/integration/vendor-scan-visual-v16');source=Path('scripts/tests/vendor_scan_geometry_v16.py')
shortlist=json.loads((root/'shortlist.private.json').read_text());assert shortlist.get('finishedAt')
images=json.loads(Path('.local/integration/vendor-scan-release-20260924/image-plan.private.json').read_text())['images'];by_id={i['id']:i for i in images}
import gzip
catalog=json.loads(gzip.decompress(Path('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz').read_bytes()));by_gv={c['id']:c['gv_id']for c in catalog}
cache={};report=dict(at=time.time(),opencv=cv2.__version__,parameters=PARAMETERS,source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),rows=[])
for label in shortlist['rows']:
    started=time.perf_counter();result=[];error=None
    try:
        raw=Path(label['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==label['sha256'];scan=prepare(raw)
        for id_ in label['ids']:
            if id_ not in cache:
                ref=by_id[id_];raw=Path(ref['source']).read_bytes();assert hashlib.sha256(raw).hexdigest()==ref['sha256'];cache[id_]=prepare(raw)
            value=verify(cache[id_],scan)
            if value:result.append(dict(id=id_,gv=by_gv[id_],**value))
    except Exception as e:error=str(e)
    row=dict(corpus=label['corpus'],file=label['file'],expected=label['expected'],candidates=result,error=error,ms=round((time.perf_counter()-started)*1000),correct=bool(result) and all(r['gv'] in label['expected'] for r in result),wrong=any(r['gv'] not in label['expected'] for r in result))
    report['rows'].append(row);(root/'geometry-regression.private.json').write_text(json.dumps(report,indent=2))
    if len(report['rows'])%20==0:print(json.dumps(dict(processed=len(report['rows']),correct=sum(r['correct']for r in report['rows']),wrong=sum(r['wrong']for r in report['rows']))),flush=True)
assert report['source_sha256']==hashlib.sha256(source.read_bytes()).hexdigest()
report['finishedAt']=time.time();report['summary']=dict(scans=len(report['rows']),correct=sum(r['correct']for r in report['rows']),wrong=sum(r['wrong']for r in report['rows']),errors=sum(bool(r['error'])for r in report['rows']))
(root/'geometry-regression.private.json').write_text(json.dumps(report,indent=2));print(json.dumps(report['summary']))
