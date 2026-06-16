# Atlas

### An Explorer's Gazetteer to the Shared World

> Being a field guide to a single fictional world charted on a twelve by twelve
> grid, A1 through L12, where no region enters the canon until an impartial AI
> cartographer has weighed its lore against the lands already drawn beside it,
> and a quorum of validators has independently reached the same verdict.

The world is not owned by an editor. It is settled by consensus. An explorer
claims an empty coordinate and writes its lore; the Cartographer rules the claim
CANON, CONTESTED, or APOCRYPHA; and only a CANON ruling, once every validator
agrees, inks a new region onto the one shared map.

- Contract on the explorer: https://explorer-bradbury.genlayer.com/address/0x2EA3a9aa16a57BD0F6f8d8ac5e20819772554a99
- Deploy transaction: https://explorer-bradbury.genlayer.com/tx/0x28054928aa482c92fa4202bfaa41ea7c6843ac9f562e356db39499d718ba38b1

---

## I. The lay of the land

The map is a fixed grid of 144 cells. Each cell is either inked CANON (a charted
region with a name and a body of lore) or open frontier (uncharted parchment a
new claim may try to fill). The whole world is held on-chain: there is no server
and no database. The Intelligent Contract is the only authority over what is
canon, and a static front end simply renders the chart it reads back.

A claim carries three things: a coordinate (for example `F6`), a region name (up
to 60 characters), and the region's lore (up to 700 characters). Everything else,
the ruling, the coherence score, the cartographer's note, and the place in the
chronicle, is decided on-chain and written by the contract.

## II. The law of the Cartographer

The Cartographer is an injection-resistant language model that never works alone.
It judges a claim on two questions: is the lore internally coherent, and does it
sit honestly beside the canon already charted in the neighbouring cells. From
those it returns one of three rulings, each bound to a band of a 0 to 100
coherence score:

```
  CANON       coheres with itself and its neighbours        coherence 67 - 100   inked onto the map
  CONTESTED   vivid and plausible but it conflicts          coherence 34 -  66   recorded as a dispute
  APOCRYPHA   incoherent, empty, or a manipulation attempt  coherence  0 -  33   turned away at the border
```

Only CANON occupies the cell. CONTESTED and APOCRYPHA are preserved in the
chronicle as a permanent record of what was proposed and refused, but they never
claim the ground.

## III. How a verdict is surveyed (the consensus)

A claim is the one place where state-changing AI judgment happens, and it runs
through `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`. A leader node drafts
the verdict; every validator independently re-runs the identical judgment and
will only accept the leader if the ruling matches exactly and the coherence
agrees within a bounded tolerance.

```python
def leader_fn():
    raw = gl.nondet.exec_prompt(prompt, response_format="json")
    return _normalize_verdict(raw)

def validator_fn(leaders_res: gl.vm.Result) -> bool:
    if not isinstance(leaders_res, gl.vm.Return):
        return _handle_leader_error(leaders_res, leader_fn)
    mine = leader_fn()                       # each validator re-judges the claim
    theirs = leaders_res.calldata
    if not isinstance(theirs, dict):
        return False
    if mine["ruling"] != theirs.get("ruling"):
        return False                          # the ruling drives the map: exact match
    a, b = int(mine["coherence"]), int(theirs.get("coherence", -1))
    return b >= 0 and abs(a - b) <= max(15, (15 * max(a, b)) // 100)

return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

Before the model is ever consulted, deterministic guards reject a malformed
coordinate, an empty or oversized name or lore, and any attempt to reclaim a cell
that is already canon. After consensus returns, a deterministic backstop clamps
the coherence into the band its ruling requires, so an APOCRYPHA can never wear a
genuine number and a CANON can never read as a doubt:

```python
BAND_CANON, BAND_CONTESTED, BAND_APOCRYPHA = (67, 100), (34, 66), (0, 33)

def _clamp_to_band(ruling: str, score: int) -> int:
    lo, hi = {"CANON": BAND_CANON, "CONTESTED": BAND_CONTESTED}.get(ruling, BAND_APOCRYPHA)
    return max(lo, min(hi, score))
```

The prompt frames the neighbouring canon and the claimed lore as untrusted data,
never instructions; any claim that tries to rewrite the rules, impersonate the
system, or demand a ruling is sent to APOCRYPHA. The full survey routine,
including the neighbour-gathering and the prompt, lives in
[`contracts/contract.py`](contracts/contract.py).

## IV. The surveyor's instruments (public methods)

One write charts the world; the rest are free readings of it.

`claim_region(coord, name, lore) -> dict`
The single consensus write. Runs the guards, gathers up to six neighbouring CANON
regions as context, convenes the Cartographer under consensus, clamps the score,
and on a CANON ruling inks the region onto the map. Returns the ruling, the
clamped coherence, the note, and whether the cell was claimed.

`get_regions(start) -> list`
A page (up to 20) of charted CANON regions, in the order they were inked. This is
what draws the map and the regions index.

`get_region(coord) -> dict`
The full record of a single charted cell, or empty if the coordinate is still
frontier.

`get_chronicle(start) -> list`
The newest-first survey log: every claim ever judged, CANON, CONTESTED, or
APOCRYPHA, with its coherence and the cartographer's note.

`get_stats() -> dict`
The running tally: total claims, and how many were canon, contested, and
apocrypha, plus the grid dimensions.

## V. The boundary of contract and chart

```
   Frontier explorer (browser, static SPA)            GenLayer Bradbury
   +-------------------------------------+        +-----------------------------+
   |  SVG world chart (12 x 12)          |  reads |  Atlas Intelligent Contract |
   |   biome-inked CANON tiles           | <----- |   regions  (the inked map)  |
   |   hatched uncharted frontier        |        |   chronicle (every verdict) |
   |   compass rose, coordinate margins  |  write |                             |
   |   claim cartouche + survey theater  | -----> |   claim_region              |
   |   genlayer-js, slow polling         |        |     guards -> consensus ->  |
   +-------------------------------------+        |     backstop -> ink         |
                                                  +-----------------------------+
```

The contract holds every authoritative byte. The chart only reads regions and the
chronicle and submits a single claim transaction; nothing is computed off-chain
and trusted.

## VI. Reading the chart (the front end)

A static Next.js export talking to the chain through `genlayer-js`, drawn in an
antique illuminated cartography hand: aged parchment vellum, sepia ink, a
cartographer-green for charted land, oxblood region borders, and a drawn compass
rose. The world map is rendered in SVG as a fixed twelve by twelve chart with
ruled A to L and 1 to 12 coordinate margins; charted cells are inked with
per-biome textures while the frontier stays a hatched "here be uncharted"
parchment that invites a claim. When a survey is dispatched the consensus is
staged as theater (dispatched, the cartographer deliberating, validators
re-running, the verdict sealed), with the leader's draft peeked from the receipt
while the network works. Reads poll slowly and pause during a write; a failed read
degrades a single panel, never the whole chart; nothing on the map is mock data.

## VII. Marginalia

There are no deposits and no custody: a claim only pays the network fee for its
own transaction, and the contract never transfers value. Majority agreement
settles a verdict; a single out-of-tolerance validator is normal and not a
failure. Every region, ruling, and note stored on-chain is public by design,
which is precisely what makes the shared world auditable.

## License

MIT.
