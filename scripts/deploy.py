import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402
from genlayer_py.types import TransactionStatus  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(__file__))
client, account = make_client()
print("deployer", account.address)

code = open(os.path.join(ROOT, "contracts/contract.py"), "r", encoding="utf-8").read()
print("code bytes", len(code.encode("utf-8")))

tx_hash = client.deploy_contract(code=code, args=[])
print("deploy_tx", tx_hash)

client.wait_for_transaction_receipt(
    transaction_hash=tx_hash,
    status=TransactionStatus.ACCEPTED,
    interval=5000,
    retries=160,
)

tx = client.get_transaction(transaction_hash=tx_hash)
def g(o, k):
    if isinstance(o, dict):
        return o.get(k)
    return getattr(o, k, None)

addr = g(tx, "recipient")
out = {
    "contract_address": addr,
    "address": addr,
    "deploy_tx": tx_hash,
    "status_name": g(tx, "status_name"),
    "exec_result": g(tx, "tx_execution_result_name"),
    "result_name": g(tx, "result_name"),
}
print(json.dumps(out, indent=2, default=str))
with open(os.path.join(ROOT, "deployment.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, default=str)
print("WROTE deployment.json")
