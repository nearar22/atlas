import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(__file__))
addr = json.load(open(os.path.join(ROOT, "deployment.json")))["address"]
if len(sys.argv) > 1:
    addr = sys.argv[1]
client, account = make_client()
print("addr:", addr)
print("get_stats:", json.dumps(read_view(client, account, addr, "get_stats"), default=str))
print("get_regions:", json.dumps(read_view(client, account, addr, "get_regions", [0]), default=str))
print("get_chronicle:", json.dumps(read_view(client, account, addr, "get_chronicle", [0]), default=str))
