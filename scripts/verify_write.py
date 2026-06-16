"""Execute a real on-chain AI write on Bradbury: claim_region.
Tolerant of unknown status codes and non-terminal timeouts."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402

import genlayer_py.types.transactions as T  # noqa: E402
from genlayer_py.types.transactions import TransactionStatus  # noqa: E402
for code in ("9", "10", "11", "14", "15", "16"):
    T.TRANSACTION_STATUS_NUMBER_TO_NAME.setdefault(code, TransactionStatus.LEADER_TIMEOUT)

ROOT = os.path.dirname(os.path.dirname(__file__))
OUT = os.path.join(ROOT, "write_out.txt")
TERMINAL = {"ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED"}
lines = []


def log(m):
    lines.append(str(m))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(m)


def poll(client, tx, label, retries=200):
    last = None
    for _ in range(retries):
        try:
            full = client.get_transaction(transaction_hash=tx)
            if not isinstance(full, dict):
                full = dict(full)
            name = str(full.get("status_name"))
            if name != last:
                log(label + " status=" + name)
                last = name
            if name in TERMINAL:
                log(label + " FINAL status=" + name + " exec=" + str(full.get("tx_execution_result_name")) + " result=" + str(full.get("result_name")))
                return name
        except Exception as e:
            log(label + " poll err " + repr(e)[:140])
        time.sleep(6)
    log(label + " TIMED OUT")
    return None


def main():
    addr = sys.argv[1] if len(sys.argv) > 1 else json.load(open(os.path.join(ROOT, "deployment.json")))["address"]
    coord = sys.argv[2] if len(sys.argv) > 2 else "F6"
    client, account = make_client()
    log("addr=" + addr + " coord=" + coord)

    name = "Verdant Hollow of Thessmoor"
    lore = (
        "Thessmoor is a fog-laced lowland of peat bogs and standing stones at the heart of the "
        "world map. Its people, the Mire-Wardens, cut turf by season and read weather in the "
        "drifting heron flights. A slow black river, the Wend, coils west toward the coast, and "
        "ancient causeways of laid timber cross the deepest marsh. No mountains rise here; the "
        "land is flat, wet, and old, and its history is one of quiet keepers rather than kings."
    )
    tx = client.write_contract(address=addr, function_name="claim_region", args=[coord, name, lore])
    log("claim_region tx=" + str(tx))
    poll(client, tx, "claim_region")
    time.sleep(4)
    try:
        log("region after claim: " + json.dumps(read_view(client, account, addr, "get_region", [coord]), default=str))
        log("stats: " + json.dumps(read_view(client, account, addr, "get_stats"), default=str))
        log("chronicle: " + json.dumps(read_view(client, account, addr, "get_chronicle", [0]), default=str))
    except Exception as e:
        log("read err: " + repr(e)[:200])
    log("WRITE VERIFY DONE")


if __name__ == "__main__":
    main()
