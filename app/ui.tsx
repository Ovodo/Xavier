import { TwitterDashboardProps } from "@/lib/types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { logout } from "@/actions/auth-actions";

export function TwitterDashboardUI(props: TwitterDashboardProps) {
  return (
    <div className="fadeIn w-full">
      {/* Header with Logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          padding: "12px 0",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
        <form action={logout}>
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              fontSize: 14,
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </form>
      </div>

      {/* Top Configuration Bar */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            alignItems: "end",
          }}
        >
          <div>
            <label>X API User ID</label>
            <input
              value={props.userId}
              onChange={(e) => props.setUserId(e.target.value)}
              placeholder="e.g. 44196397"
            />
          </div>
          <div>
            <label>Username Label</label>
            <input
              value={props.username}
              onChange={(e) => props.setUsername(e.target.value)}
              placeholder="e.g. elon"
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={props.busy}
              onClick={props.onFetchFromXApi}
              style={{ flex: 1 }}
            >
              {props.busy ? "Fetching..." : "Refresh"}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          {props.status && (
            <div className="small" style={{ color: "var(--accent2)" }}>
              {props.status}
            </div>
          )}
          {props.lastFetch && (
            <div className="small">
              Last sync: {new Date(props.lastFetch).toLocaleString()}
            </div>
          )}
        </div>
        {/* <div
          className="small"
          style={{ marginTop: 8, color: "var(--text-secondary)", opacity: 0.7 }}
        >
          ℹ️ Smart fetching: First scrape gets 3 months, subsequent scrapes
          fetch only new tweets with 5-day overlap. UI displays last 3 months
          from now. Tweets sorted by ID (Snowflake) for perfect chronological
          order.
        </div> */}
      </section>

      {/* Auto-fetch Control */}
      {/* <section
        className="card"
        style={{ marginBottom: 20, background: "rgba(124, 58, 237, 0.08)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: props.autofetchEnabled && !props.backfillComplete ? 12 : 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              🤖 Auto-Fetch (Every 15 min)
            </div>
            <div className="small">
              {props.autofetchEnabled
                ? `Monitoring User ID: ${props.autofetchUser} • Max 10 posts/request`
                : "Enable to automatically fetch new posts in the background"}
            </div>
          </div>
          <button
            onClick={props.onToggleAutofetch}
            style={{
              background: props.autofetchEnabled
                ? "rgba(239, 68, 68, 0.2)"
                : "linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(6, 182, 212, 0.25))",
              borderColor: props.autofetchEnabled ? "#ef4444" : "var(--stroke)",
            }}
          >
            {props.autofetchEnabled ? "Disable" : "Enable"}
          </button>
        </div>
        {props.autofetchEnabled && !props.backfillComplete && (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(6, 182, 212, 0.15)",
              borderRadius: "8px",
              border: "1px solid rgba(6, 182, 212, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontWeight: 650,
                  fontSize: 13,
                  color: "var(--accent2)",
                }}
              >
                ⏳ Backfill in Progress
              </div>
              <button
                onClick={() => {
                  props.onLoadAutofetchStatus();
                  props.onHandleLoadScraped();
                }}
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  background: "rgba(6, 182, 212, 0.2)",
                }}
              >
                Refresh
              </button>
            </div>
            <div className="small">
              Collecting 3 months of historical data • {props.backfillProgress.count}{" "}
              posts fetched
              {props.backfillProgress.oldest &&
                ` • Oldest: ${new Date(props.backfillProgress.oldest).toLocaleString(
                  "en-US",
                  {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  },
                )}`}
            </div>
          </div>
        )}
        {props.autofetchEnabled && props.backfillComplete && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(34, 197, 94, 0.15)",
              borderRadius: "8px",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              marginTop: 10,
            }}
          >
            <div className="small" style={{ color: "#22c55e" }}>
              ✓ Backfill complete • Now monitoring for new posts
            </div>
          </div>
        )}
        {props.autofetchEnabled && props.rateLimited && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(251, 146, 60, 0.15)",
              borderRadius: "8px",
              border: "1px solid rgba(251, 146, 60, 0.3)",
              marginTop: 10,
            }}
          >
            <div className="small" style={{ color: "#fb923c" }}>
              ⏸️ Rate limited • Cooldown: {Math.ceil(props.rateLimitWait / 60)}{" "}
              minutes
            </div>
          </div>
        )}
      </section> */}

      {/* Summary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{props.totals.total}</div>
          <div className="metric-label">Total Volume</div>
        </div>
        <div
          className="metric-card"
          style={{ borderLeft: "4px solid #7c3aed" }}
        >
          <div className="metric-value">{props.totals.posts}</div>
          <div className="metric-label">Posts</div>
        </div>
        <div
          className="metric-card"
          style={{ borderLeft: "4px solid #06b6d4" }}
        >
          <div className="metric-value">{props.totals.quotes}</div>
          <div className="metric-label">Quotes</div>
        </div>
        <div
          className="metric-card"
          style={{ borderLeft: "4px solid #22c55e" }}
        >
          <div className="metric-value">{props.totals.reposts}</div>
          <div className="metric-label">Reposts</div>
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div style={{ display: "grid", gap: 20 }}>
        {/* Chart Section */}
        <section className="card">
          <div style={{ fontWeight: 750, fontSize: 16, marginBottom: 16 }}>
            Activity Timeline
          </div>
          <div style={{ height: 240, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={props.filteredStats}>
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0b1020",
                    border: "1px solid var(--stroke)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="posts"
                  stroke="#7c3aed"
                  fillOpacity={1}
                  fill="url(#colorPosts)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="quotes"
                  stroke="#06b6d4"
                  fill="transparent"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="reposts"
                  stroke="#22c55e"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Posts List Section */}
        <section className="card">
          {/* Date Range Filter */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label className="small">From:</label>
              <input
                type="date"
                value={props.startDate}
                onChange={(e) => {
                  props.setStartDate(e.target.value);
                  props.setActivePreset("custom");
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  background: "var(--bg)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 6,
                  color: "var(--text)",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label className="small">To:</label>
              <input
                type="date"
                value={props.endDate}
                onChange={(e) => {
                  props.setEndDate(e.target.value);
                  props.setActivePreset("custom");
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  background: "var(--bg)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 6,
                  color: "var(--text)",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { label: "All", value: "all" },
                { label: "7 Days", value: "7d" },
                { label: "30 Days", value: "30d" },
                { label: "This Month", value: "thisMonth" },
                { label: "Last Month", value: "lastMonth" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => props.onSetDatePreset(p.value)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    background:
                      props.activePreset === p.value
                        ? "rgba(124, 58, 237, 0.4)"
                        : "rgba(124, 58, 237, 0.15)",
                    border: `1px solid ${props.activePreset === p.value ? "#7c3aed" : "var(--stroke)"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: props.activePreset === p.value ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {(props.startDate || props.endDate) && (
              <span className="small" style={{ color: "var(--accent2)" }}>
                Showing: {props.startDate || "∞"} → {props.endDate || "∞"}
              </span>
            )}
          </div>

          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="Search posts..."
              value={props.searchQuery}
              onChange={(e) => props.setSearchQuery(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="small" style={{ color: "var(--muted)" }}>
                Sort:
              </span>
              <button
                onClick={() => props.setSortOrder("desc")}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  background:
                    props.sortOrder === "desc"
                      ? "rgba(124, 58, 237, 0.4)"
                      : "rgba(124, 58, 237, 0.15)",
                  border: `1px solid ${props.sortOrder === "desc" ? "#7c3aed" : "var(--stroke)"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: props.sortOrder === "desc" ? 600 : 400,
                }}
              >
                ↓ Newest
              </button>
              <button
                onClick={() => props.setSortOrder("asc")}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  background:
                    props.sortOrder === "asc"
                      ? "rgba(124, 58, 237, 0.4)"
                      : "rgba(124, 58, 237, 0.15)",
                  border: `1px solid ${props.sortOrder === "asc" ? "#7c3aed" : "var(--stroke)"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: props.sortOrder === "asc" ? 600 : 400,
                }}
              >
                ↑ Oldest
              </button>
            </div>
            <div className="tabs">
              {["all", "post", "repost", "quote"].map((kind) => (
                <button
                  key={kind}
                  className={`tab ${props.activeKind === kind ? "active" : ""}`}
                  onClick={() => props.setActiveKind(kind)}
                >
                  {kind.charAt(0).toUpperCase() + kind.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 0 }}>
            {props.filteredTweets.map((t) => (
              <div key={t.tweet_id} className="tweet-card">
                {(() => {
                  const replyHandle = (t.reply_to_handle || "").replace(
                    /^@/,
                    "",
                  );
                  const authorHandle = (t.username || "").replace(/^@/, "");
                  const handleLabel = (() => {
                    if (
                      (t.kind === "repost" || t.kind === "quote") &&
                      replyHandle
                    )
                      return replyHandle;
                    if (t.kind === "reply" && replyHandle) return replyHandle;
                    return authorHandle;
                  })();
                  const badgeLabel =
                    t.kind === "repost"
                      ? "RT"
                      : t.kind === "quote"
                        ? "QT"
                        : t.kind === "reply"
                          ? "@"
                          : "PT";

                  // For reposts: show posted_at (original post time), for others: show created_at
                  const dateToShow = t.posted_at || t.created_at;
                  const isRepost = !!t.posted_at;

                  return (
                    <div
                      className="tweet-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          className="badge"
                          style={{ borderColor: "var(--stroke)" }}
                        >
                          {badgeLabel}
                        </span>
                        <span
                          className="small"
                          style={{ color: "var(--accent2)" }}
                        >
                          {handleLabel ? `@${handleLabel}` : ""}
                        </span>
                      </div>
                      <span
                        className="small"
                        style={{
                          whiteSpace: "nowrap",
                          color: isRepost ? "#7c3aed" : undefined,
                          fontWeight: isRepost ? 600 : undefined,
                        }}
                        title={isRepost ? "Main post time" : undefined}
                      >
                        {dateToShow
                          ? new Date(dateToShow).toLocaleString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : ""}
                      </span>
                    </div>
                  );
                })()}
                <div
                  style={{
                    lineHeight: 1.5,
                    fontSize: 15,
                    color: "var(--text)",
                    marginTop: 4,
                  }}
                >
                  {t.text}
                </div>
                {t.url && (
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="small"
                    style={{
                      color: "var(--accent2)",
                      marginTop: 8,
                      display: "inline-block",
                    }}
                  >
                    View on X ↗
                  </a>
                )}
              </div>
            ))}
            {props.filteredTweets.length === 0 && (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--muted)",
                }}
              >
                {props.tweets.length === 0
                  ? "No data loaded yet."
                  : "No posts match your filters."}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
