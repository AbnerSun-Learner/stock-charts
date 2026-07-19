# Index Metrics Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist source-attributed index close, PE, and PB histories in `scheduled-tasks` for the index analysis dashboard.

**Architecture:** Add a normalized `index_daily_metrics` table owned by `scheduled-tasks`. Red Rocket supplies the primary history, CSI validates supported domestic close/PE fields, and field-level upserts preserve valid values from either source. The renamed snapshot table is `index_valuation`; implementation must not introduce new `etf_valuation` references.

**Tech Stack:** Python 3.11, psycopg 3, PostgreSQL/Supabase, pytest, Ruff, GitHub Actions.

## Global Constraints

- Do not fetch or parse ETF.run.
- `scheduled-tasks` exclusively owns migrations and third-party market clients.
- Use `index_valuation`, not `etf_valuation`, for the renamed snapshot table.
- Preserve the user's unrelated dirty files and untracked migration.
- Missing source fields must not erase previously stored values.
- Repeated sync runs must be idempotent.

---

### Task 1: Define the daily metrics table

**Files:**
- Create: `../scheduled-tasks/src/scheduled_tasks/models/migrations/20260719_index_daily_metrics.sql`
- Modify: `../scheduled-tasks/src/scheduled_tasks/models/schema.sql`
- Modify: `../scheduled-tasks/src/scheduled_tasks/models/migrations/20260718_index_market_anon_read.sql`

**Interfaces:**
- Consumes: existing `public.indices(code)` primary key and `cockpit_apply_public_read(regclass)` helper.
- Produces: `public.index_daily_metrics(index_code, trade_date, close, pe_ttm, pb, price_source, valuation_source, updated_at)`.

- [ ] **Step 1: Write the migration contract**

```sql
create table if not exists public.index_daily_metrics (
  index_code text not null references public.indices(code) on delete cascade,
  trade_date date not null,
  close numeric,
  pe_ttm numeric,
  pb numeric,
  price_source text,
  valuation_source text,
  updated_at timestamptz not null default now(),
  primary key (index_code, trade_date),
  constraint index_daily_metrics_close_positive check (close is null or close > 0),
  constraint index_daily_metrics_pe_positive check (pe_ttm is null or pe_ttm > 0),
  constraint index_daily_metrics_pb_positive check (pb is null or pb > 0),
  constraint index_daily_metrics_has_value check (num_nonnulls(close, pe_ttm, pb) > 0)
);

create index if not exists idx_index_daily_metrics_trade_date
  on public.index_daily_metrics (trade_date desc);

select public.cockpit_apply_public_read('public.index_daily_metrics');
```

- [ ] **Step 2: Add the same canonical table definition to `schema.sql`**

Place it after `indices` and before `index_industry_weights`; keep the migration as the production upgrade path.

- [ ] **Step 3: Extend the existing anon-read migration idempotently**

```sql
if to_regclass('public.index_daily_metrics') is not null then
  perform public.cockpit_apply_public_read('public.index_daily_metrics');
end if;
```

- [ ] **Step 4: Validate SQL references**

Run: `rg -n "index_daily_metrics|etf_valuation" src/scheduled_tasks/models`

Expected: the new table appears in all three files; no newly added `etf_valuation` reference exists.

- [ ] **Step 5: Commit only the table task files**

```bash
git add src/scheduled_tasks/models/schema.sql \
  src/scheduled_tasks/models/migrations/20260719_index_daily_metrics.sql \
  src/scheduled_tasks/models/migrations/20260718_index_market_anon_read.sql
git commit -m "feat(index): add daily metrics table"
```

### Task 2: Parse Red Rocket PE/PB histories

**Files:**
- Modify: `../scheduled-tasks/src/scheduled_tasks/etf/hongsehuojian_client.py`
- Modify: `../scheduled-tasks/tests/test_hongsehuojian.py`

**Interfaces:**
- Consumes: `_api_get`, `parse_trade_date`, `_num`, and `/fundex-quote/index/valuation`.
- Produces: `fetch_index_valuation_history(index_code: str, valuation_type: str, time_interval: str = "last_10_years") -> list[dict[str, Any]]` and `fetch_index_daily_metrics_bundle(index_code: str, *, end: date | None = None, max_bars: int | None = None, include_prices: bool = True, base_url: str = DEFAULT_BASE_URL) -> list[dict[str, Any]]`.

- [ ] **Step 1: Write failing parser tests**

```python
@pytest.mark.parametrize(("valuation_type", "field"), [("PE", "pe_ttm"), ("PB", "pb")])
def test_fetch_index_valuation_history_maps_daily_values(monkeypatch, valuation_type, field):
    from scheduled_tasks.etf import hongsehuojian_client as client

    monkeypatch.setattr(client, "_api_get", lambda *_a, **_k: {
        "items": [
            {"tradeDate": "20260717", "valuationValue": "22.62"},
            {"tradeDate": "20260716", "valuationValue": "0"},
        ]
    })
    rows = client.fetch_index_valuation_history("000300.SH", valuation_type)
    assert rows == [{
        "index_code": "000300.SH",
        "trade_date": date(2026, 7, 17),
        field: 22.62,
        "valuation_source": "hongsehuojian",
    }]
```

- [ ] **Step 2: Run the parser tests and confirm failure**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest tests/test_hongsehuojian.py -q`

Expected: FAIL because `fetch_index_valuation_history` is missing.

- [ ] **Step 3: Implement a generic valuation history fetcher**

```python
def fetch_index_valuation_history(
    index_code: str,
    valuation_type: str,
    *,
    time_interval: str = "last_10_years",
    base_url: str = DEFAULT_BASE_URL,
) -> list[dict[str, Any]]:
    metric = valuation_type.strip().upper()
    if metric not in {"PE", "PB"}:
        raise ValueError(f"unsupported valuation_type: {valuation_type}")
    data = _api_get(
        "/fundex-quote/index/valuation",
        {
            "securityCode": to_security_code(index_code, kind="index"),
            "valuationType": metric,
            "timeInterval": time_interval,
        },
        base_url=base_url,
    )
    field = "pe_ttm" if metric == "PE" else "pb"
    rows = []
    for item in data.get("items") or []:
        value = _num(item.get("valuationValue")) if isinstance(item, dict) else None
        if value is None or value <= 0:
            continue
        rows.append({
            "index_code": index_code,
            "trade_date": parse_trade_date(item["tradeDate"]),
            field: value,
            "valuation_source": VALUATION_SOURCE,
        })
    return sorted(rows, key=lambda row: row["trade_date"])
```

- [ ] **Step 4: Add bundle merge tests**

Test that close-only, PE-only, PB-only, and overlapping dates merge into one row per date without replacing an existing value with `None`.

- [ ] **Step 5: Implement `merge_index_metric_rows` and `fetch_index_daily_metrics_bundle`**

The bundle fetches index close history plus PE and PB in parallel. Each output row contains the primary key, available metrics, and only the relevant source fields.

- [ ] **Step 6: Run tests and lint**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest tests/test_hongsehuojian.py -q`

Run: `UV_CACHE_DIR=.uv-cache uv run ruff check src/scheduled_tasks/etf/hongsehuojian_client.py tests/test_hongsehuojian.py`

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add src/scheduled_tasks/etf/hongsehuojian_client.py tests/test_hongsehuojian.py
git commit -m "feat(index): parse PE and PB histories"
```

### Task 3: Add field-preserving database upserts

**Files:**
- Modify: `../scheduled-tasks/src/scheduled_tasks/db.py`
- Create: `../scheduled-tasks/tests/test_index_daily_metrics_db.py`

**Interfaces:**
- Consumes: daily metric dictionaries from Task 2.
- Produces: `upsert_index_daily_metrics(conn, rows) -> int` and `latest_index_metric_date(conn, index_code) -> date | None`.

- [ ] **Step 1: Write a failing SQL-shape test with a mock connection**

Assert `executemany` receives rows and the SQL uses field-level coalescing:

```sql
close = coalesce(excluded.close, index_daily_metrics.close),
pe_ttm = coalesce(excluded.pe_ttm, index_daily_metrics.pe_ttm),
pb = coalesce(excluded.pb, index_daily_metrics.pb)
```

Source fields update only when their associated data field is supplied.

- [ ] **Step 2: Run the test and confirm failure**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest tests/test_index_daily_metrics_db.py -q`

Expected: FAIL because the database functions are missing.

- [ ] **Step 3: Implement upsert and latest-date helpers**

Normalize missing keys to `None` before `executemany`. Use `on conflict (index_code, trade_date) do update` and never delete history during refresh.

- [ ] **Step 4: Run focused tests and Ruff**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest tests/test_index_daily_metrics_db.py -q`

Run: `UV_CACHE_DIR=.uv-cache uv run ruff check src/scheduled_tasks/db.py tests/test_index_daily_metrics_db.py`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scheduled_tasks/db.py tests/test_index_daily_metrics_db.py
git commit -m "feat(index): upsert daily metrics"
```

### Task 4: Sync metrics and apply CSI field overrides

**Files:**
- Modify: `../scheduled-tasks/src/scheduled_tasks/jobs/sync_hongsehuojian_fill_validate.py`
- Modify: `../scheduled-tasks/src/scheduled_tasks/jobs/sync_official_cross_check.py`
- Modify: `../scheduled-tasks/tests/test_hongsehuojian.py`
- Modify: `../scheduled-tasks/tests/test_official_cross_check.py`

**Interfaces:**
- Consumes: Task 2 fetch bundle and Task 3 upsert.
- Produces: sync summary counts for metric rows and CSI overrides stored in `index_daily_metrics`.

- [ ] **Step 1: Write failing job tests**

Cover:

Use concrete fixtures containing one close row, one PE row, and one PB row. Patch the fetch bundle and database upsert, invoke the existing job entry point, and assert the upsert receives all three values on the same `(index_code, trade_date)` key. For `valuation-only`, assert the bundle call receives `include_prices=False`. For a simulated PB exception, assert close/PE rows are still passed to the upsert and the summary records the PB failure. For CSI override, pass a CSI row with `close=4500` and `current_pe_ttm=22`, then assert the upsert row contains `price_source="csindex"`, `valuation_source="csindex"`, and no `pb` key.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest tests/test_hongsehuojian.py tests/test_official_cross_check.py -q`

Expected: FAIL on missing metric sync behavior.

- [ ] **Step 3: Integrate Red Rocket metrics into the existing job**

For `incremental`, request a bounded recent close window and the 10-year valuation response, then upsert. For `full`, request full close history and the longest available 10-year PE/PB histories. For `valuation-only`, skip close but upsert PE/PB histories and refresh `index_valuation` from the newest PE row.

- [ ] **Step 4: Change snapshot references to `index_valuation` names**

Use database helpers named `fetch_index_valuation_snapshot`, `upsert_index_valuation_snapshot`, and `update_index_valuation_pe_official`. Do not add compatibility aliases using the old table name.

- [ ] **Step 5: Apply CSI overrides through the daily metrics upsert**

Map CSI rows to `close`, `pe_ttm`, `price_source="csindex"`, and `valuation_source="csindex"`. Omit `pb`, so Red Rocket PB remains intact.

- [ ] **Step 6: Run job tests, all pytest, and Ruff**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest tests/test_hongsehuojian.py tests/test_official_cross_check.py -q`

Run: `UV_CACHE_DIR=.uv-cache uv run pytest -q`

Run: `UV_CACHE_DIR=.uv-cache uv run ruff check .`

Expected: all pass.

- [ ] **Step 7: Commit only owned changes**

```bash
git add src/scheduled_tasks/jobs/sync_hongsehuojian_fill_validate.py \
  src/scheduled_tasks/jobs/sync_official_cross_check.py \
  tests/test_hongsehuojian.py tests/test_official_cross_check.py
git commit -m "feat(index): sync historical metrics"
```

### Task 5: Document and verify production handoff

**Files:**
- Modify: `../scheduled-tasks/doc/hongsehuojian-fill-validate.md`
- Modify: `../scheduled-tasks/doc/supabase-schema.md`

**Interfaces:**
- Consumes: completed schema and jobs.
- Produces: exact migration, sync, and verification commands for deployment.

- [ ] **Step 1: Document the new table, source precedence, and `index_valuation` name**

State that Red Rocket PB/PE history is limited to the longest supported API interval (currently 10 years), while close history may be longer.

- [ ] **Step 2: Add verification SQL**

```sql
select index_code, count(*) as rows,
       min(trade_date) as first_date, max(trade_date) as last_date,
       count(pe_ttm) as pe_rows, count(pb) as pb_rows
from public.index_daily_metrics
group by index_code
order by index_code;
```

- [ ] **Step 3: Run final repository verification**

Run: `UV_CACHE_DIR=.uv-cache uv run pytest -q`

Run: `UV_CACHE_DIR=.uv-cache uv run ruff check .`

Run: `git diff --check`

Expected: all pass and no whitespace errors.

- [ ] **Step 4: Commit docs**

```bash
git add doc/hongsehuojian-fill-validate.md doc/supabase-schema.md
git commit -m "docs(index): describe daily metrics sync"
```
