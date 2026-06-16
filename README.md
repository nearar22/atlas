# Atlas: A Gazetteer of the Shared World

> An on-chain AI canon-keeper for a single shared fictional world drawn on a 12x12 grid (A1 through L12). An explorer claims a region coordinate and writes its lore; an injection-resistant AI cartographer rules the claim CANON, CONTESTED, or APOCRYPHA with a 0-100 coherence score against the established canon of neighbouring regions, under GenLayer validator consensus. Only a CANON ruling claims the tile and grows the on-chain world atlas.

This document is written as a field guide for explorers: a numbered gazetteer of the world, its map legends, the law of the cartographer, and a catalogue of every survey instrument (public method) you may call. Read it the way you would read the marginalia of an old map.

- Contract on the explorer: https://explorer-bradbury.genlayer.com/address/0x2EA3a9aa16a57BD0F6f8d8ac5e20819772554a99
- Deploy transaction: https://explorer-bradbury.genlayer.com/tx/0x28054928aa482c92fa4202bfaa41ea7c6843ac9f562e356db39499d718ba38b1
- Full contract source: [contracts/contract.py](contracts/contract.py)

---

## Legend

The map is read with three symbols. Every claim resolves to exactly one of them.

```
[##]  CANON       coherence 67-100   claims the tile, joins the world atlas
[~~]  CONTESTED   coherence 34-66    recorded in the chronicle, tile stays open
[..]  APOCRYPHA   coherence 0-33     recorded in the chronicle, tile stays open
```

Grid bounds: columns A through L, rows 1 through 12. A coordinate is a letter then a number, for example F6. Region names run 1 to 60 characters; lore runs 1 to 700 characters. A tile that is already CANON cannot be reclaimed.

---

## 1. The territory and why it needs a keeper

A shared fictional world only stays coherent if someone guards the seams where one region meets another. A coastline cannot border an inland province that calls itself landlocked. A river cannot flow two directions. A people fixed by one region's history cannot be silently rewritten by the next explorer.

Atlas hands that guardianship to an AI cartographer whose ruling is not advisory decoration but the actual on-chain settlement. When a claim is ruled CANON, the tile is occupied and the world grows. When it is ruled CONTESTED or APOCRYPHA, the attempt is preserved in an append-only chronicle but the tile remains open for a better claim. No central server, no custody, no deposits: the Intelligent Contract holds all authoritative state.

---

## 2. How a claim becomes canon (the consensus survey)

The cartographer is run through GenLayer's optimistic-democracy consensus, so the judgment is reproduced by many validators rather than trusted from one machine.

1. Deterministic guards run first, before any model call. The coordinate is normalized and bounds-checked (A1 through L12), the name and lore lengths are validated, and an already-claimed tile is rejected outright. These never touch the LLM.
2. A compact summary of the established CANON in the 8 adjacent tiles is assembled and fed to the cartographer, so the claim must cohere with its neighbours rather than be judged in a vacuum.
3. The judgment runs under `gl.vm.run_nondet_unsafe`. A leader proposes a ruling and coherence score. Every validator independently re-runs the same prompt and accepts only if the ruling matches exactly and the coherence falls within a tolerance of `max(15, 15%)` of the leader's score. Disagreement past that band fails the round.
4. Backstops run after consensus. The score is clamped into the band its ruling requires (APOCRYPHA 0-33, CONTESTED 34-66, CANON 67-100), so the number can never contradict the verdict. Only a CANON ruling occupies a tile.

Injection resistance is built into the prompt contract: everything inside the claimed lore is treated as untrusted data, never as instructions. Any attempt to change the rules, impersonate the system, or demand a ruling forces APOCRYPHA.

### Consensus-core excerpt

The full judging routine lives in [contracts/contract.py](contracts/contract.py). The heart of it:

```python
def leader_fn():
    raw = gl.nondet.exec_prompt(prompt, response_format="json")
    return _normalize_verdict(raw)

def validator_fn(leaders_res: gl.vm.Result) -> bool:
    if not isinstance(leaders_res, gl.vm.Return):
        return _handle_leader_error(leaders_res, leader_fn)
    mine = leader_fn()
    theirs = leaders_res.calldata
    if mine["ruling"] != theirs.get("ruling"):
        return False
    a, b = int(mine["coherence"]), int(theirs.get("coherence", -1))
    return b >= 0 and abs(a - b) <= max(15, (15 * max(a, b)) // 100)

return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

# post-consensus backstop: the score can never leave its ruling's band
def _clamp_to_band(ruling: str, score: int) -> int:
    lo, hi = {"CANON": (67, 100), "CONTESTED": (34, 66)}.get(ruling, (0, 33))
    return max(lo, min(hi, score))
```

---

## 3. Architecture: the contract and frontend boundary

```
   EXPLORER (browser wallet)
            |
            |  claim_region(coord, name, lore)            views: get_regions / get_region
            |  signed write tx                            get_chronicle / get_stats
            v                                                     ^
 +-------------------------------------------------------------------------+
 |  GenLayer Intelligent Contract  (contracts/contract.py)                 |
 |                                                                         |
 |   guards  ->  neighbour-canon summary  ->  gl.vm.run_nondet_unsafe      |
 |   (bounds, len,        (8-adjacent          leader proposes ruling,     |
 |    claimed?)            CANON excerpts)      validators re-run + agree   |
 |                                                   |                     |
 |   backstops  <------------------------------------+                     |
 |   (clamp to band, only CANON occupies a tile)                          |
 |                                                                         |
 |   state:  regions (TreeMap) | region_ids | chronicle | tallies          |
 +-------------------------------------------------------------------------+
            ^
            |  read-only RPC (genlayer-js), slow polling
            |
   FRONTEND (Next.js static export -> Cloudflare Pages)
   pannable parchment world-map canvas + gazetteer margin + claim cartouche
```

The frontend never holds authoritative state. It reads the contract and stages the consensus moment; the contract decides.

---

## 4. Survey instruments (public methods)

Every interaction with the world goes through one of these. One write moves the map; four views read it.

### 4.1 claim_region(coord, name, lore) -> dict

The only write, and the AI judgment. Submits a region claim at `coord` with a `name` and free-text `lore`. Runs the guards, the neighbour-canon survey, the consensus judging round, and the backstops, then records the outcome. Returns a verdict dict:

```json
{ "coord": "F6", "name": "Verdant Hollow of Thessmoor", "ruling": "CANON", "coherence": 90, "note": "...", "claimed": true }
```

Only a CANON ruling sets `claimed: true` and occupies the tile. CONTESTED and APOCRYPHA return `claimed: false` and leave the tile open.

### 4.2 get_regions(start) -> list

Returns a page of CANON tiles (up to 20) in claim order, starting at index `start`. This is the world atlas itself: the regions that have been admitted to canon. Each item is the full region record (coord, name, lore, explorer, coherence, note, seq).

### 4.3 get_region(coord) -> dict

Returns the full CANON record for a single tile, or an empty dict if the coordinate is invalid or unclaimed. Used to open a region's detail in the cartouche.

### 4.4 get_chronicle(start) -> list

Returns a page (up to 20) of the append-only ruling log in newest-first order, starting at offset `start`. This includes every claim attempt, CANON, CONTESTED, and APOCRYPHA alike, so the disputes and rejections are as legible as the canon.

### 4.5 get_stats() -> dict

Returns world tallies: total claims, canon, contested, apocrypha counts, chronicle length, and the grid dimensions (cols, rows).

---

## 5. A worked entry: F6, the Verdant Hollow of Thessmoor

This is a real, verified claim recorded on-chain, presented as a gazetteer entry.

```
Region    F6
Name      Verdant Hollow of Thessmoor
Ruling    CANON          [##]
Coherence 90 / 100        (CANON band 67-100)
Status    Tile claimed; admitted to the world atlas
```

The claim coheres with its surveyed neighbours and reads as internally consistent worldbuilding, so the cartographer ruled it CANON with a coherence of 90, validators agreed within tolerance, and the backstop confirmed 90 sits inside the CANON band. The tile F6 is now occupied and appears in `get_regions`.

---

## 6. Frontend stack and UX decisions

Stack: Next.js (static export, `output: 'export'`), genlayer-js for all contract reads and the signed write, framer-motion for motion, lucide-react for inline icons.

Key UX decisions:

- The pannable parchment world-map canvas is the primary surface. You land on a living shared map with claims plotted on it, not a marketing page and not a feed.
- A slim gazetteer margin runs alongside the map, listing regions and the chronicle so the world reads like a real atlas with marginalia.
- Claims open in an illuminated claim cartouche over the map, keeping the map as the constant backdrop.
- Consensus is staged as theater: the judging moment is shown as the cartographer deliberating rather than hidden behind a spinner.
- Slow polling (90s) keeps the reads gentle on the RPC and matches the unhurried feel of surveying a map.
- No mock data. Every region, ruling, and tally is read live from the deployed contract.

Art direction: Antique illuminated cartography. Aged parchment vellum, sepia-ink linework, a verdant cartographer's-green accent with oxblood region borders, compass roses and contour hatching, illuminated drop-capitals.

---

## 7. Quick start (local)

```
cd frontend
npm install --no-audit --no-fund
npm run dev
```

Open http://localhost:3000/atlas (local dev keeps the `/atlas` basePath; Cloudflare Pages serves from root).

To produce the static export:

```
cd frontend
$env:CF_PAGES="1"; npm run build   # output in frontend/out
```

You will need a browser wallet with a funded GenLayer Bradbury testnet account to submit a claim (claim test GEN from the wallet menu).

---

## 8. Deploy notes

- Static export is built into `frontend/out` with `CF_PAGES=1`, which toggles `basePath` to root in `next.config.js`.
- Hosting is Cloudflare Pages, project name `atlas`, deployed from `frontend/out` to the `main` branch.
- `frontend/public/.nojekyll` is committed so the export is served verbatim.
- The deployer private key lives outside the repo and is never committed.

---

## 9. Coordinates of record

- Network: GenLayer Bradbury testnet, a 12 by 12 grid (columns A through L, rows 1 through 12). The contract and deploy transaction are linked at the top of this guide.
