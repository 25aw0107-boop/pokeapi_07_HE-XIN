// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const PAGE_SIZE = 24;

function artworkUrlFromId(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function idFromPokemonUrl(url) {
  const m = url.match(/\/pokemon\/(\d+)\//);
  return m ? Number(m[1]) : null;
}

function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : str;
}

/* 生成分页：例 1 2 3 … 10 … 57（返回数组，数字或 "…"） */
function buildPagination(current, total, siblingCount = 1) {
  if (total <= 1) return [1];

  const clamp = (n) => Math.max(1, Math.min(total, n));
  const cur = clamp(current);

  // 想显示的页：1、最后一页、当前页附近
  const pages = new Set([1, total]);
  for (let i = -siblingCount; i <= siblingCount; i++) {
    pages.add(clamp(cur + i));
  }

  const sorted = [...pages].sort((a, b) => a - b);

  // 插入省略号
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i === 0) {
      result.push(p);
      continue;
    }
    const prev = sorted[i - 1];
    if (p - prev === 1) {
      result.push(p);
    } else {
      result.push("…");
      result.push(p);
    }
  }

  return result;
}

export default function App() {
  const [page, setPage] = useState(0); // 0-based
  const [query, setQuery] = useState("");
  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // 列表数据
  useEffect(() => {
    const controller = new AbortController();

    async function fetchList() {
      setLoading(true);
      setError("");

      try {
        const offset = page * PAGE_SIZE;
        const url = `https://pokeapi.co/api/v2/pokemon?limit=${PAGE_SIZE}&offset=${offset}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setCount(data.count);
        setList(
          data.results.map((p) => ({
            ...p,
            id: idFromPokemonUrl(p.url),
          }))
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          setError("データの取得に失敗しました。ネットワーク状態を確認してください。");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchList();
    return () => controller.abort();
  }, [page]);

  // 本页搜索过滤
  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.name.includes(q));
  }, [query, list]);

  const maxPage = Math.max(0, Math.ceil(count / PAGE_SIZE) - 1);
  const currentPageNumber = page + 1; // 1-based
  const totalPages = maxPage + 1;

  const paginationItems = useMemo(() => {
    // siblingCount=2 会更“像网站”，显示更多页码
    return buildPagination(currentPageNumber, totalPages, 2);
  }, [currentPageNumber, totalPages]);

  // 详情数据
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();

    async function fetchDetail() {
      setDetail(null);
      setDetailError("");
      setDetailLoading(true);

      try {
        const url = `https://pokeapi.co/api/v2/pokemon/${selectedId}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDetail(data);
      } catch (e) {
        if (e.name !== "AbortError") setDetailError("詳細データの取得に失敗しました。");
      } finally {
        setDetailLoading(false);
      }
    }

    fetchDetail();
    return () => controller.abort();
  }, [selectedId]);

  // ESC 关闭
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function goToPageNumber(pn) {
    // pn: 1-based
    const next = Math.max(1, Math.min(totalPages, pn));
    setPage(next - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <h1 className="title">ポケモン図鑑</h1>
        <p className="subtitle">
          ポケモン名で検索・詳細表示ができます
        </p>

        <div className="toolbar">
          <div className="searchWrap">
            <input
              className="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ポケモン名で検索（例：pikachu）"
            />
            <button className="btn btnGhost" onClick={() => setQuery("")}>
              クリア
            </button>
          </div>
        </div>

        {/* Pagination */}
        <nav className="pager" aria-label="pagination">
          <button
            className="btn"
            onClick={() => goToPageNumber(currentPageNumber - 1)}
            disabled={page === 0 || loading}
          >
            ← 前へ
          </button>

          <div className="pagerNumbers">
            {paginationItems.map((item, idx) => {
              if (item === "…") {
                return (
                  <span key={`dots-${idx}`} className="dots" aria-hidden="true">
                    …
                  </span>
                );
              }
              const pn = item; // number
              const active = pn === currentPageNumber;
              return (
                <button
                  key={pn}
                  className={`pageNum ${active ? "isActive" : ""}`}
                  onClick={() => goToPageNumber(pn)}
                  disabled={loading}
                  aria-current={active ? "page" : undefined}
                >
                  {pn}
                </button>
              );
            })}
          </div>

          <button
            className="btn"
            onClick={() => goToPageNumber(currentPageNumber + 1)}
            disabled={page === maxPage || loading}
          >
            次へ →
          </button>
        </nav>
      </header>

      {/* Status */}
      <div className="statusArea">
        {loading && <p className="status">読み込み中…</p>}
        {error && <p className="status statusError">{error}</p>}
        {!loading && !error && (
          <p className="status statusHint">
            Page {currentPageNumber} / {totalPages}
            {/* （本ページ内検索） */}
          </p>
        )}
      </div>

      {/* Grid */}
      <main className="grid">
        {filteredList.map((p) => (
          <button
            key={p.id}
            className="card"
            onClick={() => setSelectedId(p.id)}
            title="クリックして詳細を見る"
          >
            <img className="cardImg" src={artworkUrlFromId(p.id)} alt={p.name} loading="lazy" />
            <div className="cardName">
              #{String(p.id).padStart(3, "0")} {p.name}
            </div>
          </button>
        ))}
      </main>

      {/* Modal */}
      {selectedId && (
        <div className="modalMask" onClick={() => setSelectedId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <h2 className="modalTitle">詳細情報</h2>
              <button className="btn" onClick={() => setSelectedId(null)}>
                閉じる（ESC）
              </button>
            </div>

            {detailLoading && <p className="status">詳細を読み込み中…</p>}
            {detailError && <p className="status statusError">{detailError}</p>}

            {detail && (
              <div className="detailGrid">
                <div className="detailLeft">
                  <img
                    className="detailImg"
                    src={artworkUrlFromId(detail.id)}
                    alt={detail.name}
                    width={180}
                    height={180}
                  />
                  <div className="detailName">
                    #{String(detail.id).padStart(3, "0")} {capitalize(detail.name)}
                  </div>
                </div>

                <div className="detailRight">
                  <div className="chips">
                    <span className="chip">高さ：{detail.height / 10} m</span>
                    <span className="chip">重さ：{detail.weight / 10} kg</span>
                    {detail.types.map((t) => (
                      <span key={t.type.name} className="chip">
                        タイプ：{t.type.name}
                      </span>
                    ))}
                  </div>

                  <section className="section">
                    <div className="sectionTitle">特性</div>
                    <ul className="list">
                      {detail.abilities.map((a) => (
                        <li key={a.ability.name}>
                          {a.ability.name}
                          {a.is_hidden ? "（隠れ特性）" : ""}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="section">
                    <div className="sectionTitle">種族値</div>
                    <ul className="list">
                      {detail.stats.map((s) => (
                        <li key={s.stat.name}>
                          {s.stat.name}：{s.base_stat}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
