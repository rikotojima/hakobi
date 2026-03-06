"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ── Light mode palette ────────────────────────────────────────────────────────
const C = {
  bg:      "#f5f6fa",
  surface: "#ffffff",
  card:    "#f0f2f8",
  border:  "#e2e5f0",
  text:    "#1a1d2e",
  muted:   "#7b80a0",
  green:   "#16a34a",
  yellow:  "#d97706",
  red:     "#dc2626",
  pink:    "#db2777",
  shadow:  "0 2px 12px rgba(0,0,0,0.07)",
};

// ── Per-position brand colors (寒色・暖色ミックス) ──────────────────────────
const POSITION_COLORS = {
  "フロントエンドエンジニア": { main: "#2563eb", light: "#eff6ff", mid: "#93c5fd" }, // 青
  "プロダクトマネージャー":   { main: "#ea580c", light: "#fff7ed", mid: "#fdba74" }, // オレンジ
  "バックエンドエンジニア":   { main: "#0891b2", light: "#ecfeff", mid: "#67e8f9" }, // シアン
  "デザイナー":               { main: "#db2777", light: "#fdf2f8", mid: "#f9a8d4" }, // ピンク
  "データサイエンティスト":   { main: "#65a30d", light: "#f7fee7", mid: "#bef264" }, // 黄緑
  "セールス":                 { main: "#d97706", light: "#fffbeb", mid: "#fcd34d" }, // 黄
  "カスタマーサクセス":       { main: "#7c3aed", light: "#f5f3ff", mid: "#c4b5fd" }, // 紫
  _default:                   { main: "#6366f1", light: "#eef2ff", mid: "#a5b4fc" }, // インディゴ
};

function posColor(position) {
  return POSITION_COLORS[position] || POSITION_COLORS._default;
}

const FONT      = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";

const DEFAULT_STAGES = ["書類選考", "一次面接", "二次面接", "最終面接", "内定"];

// ── Seed data ─────────────────────────────────────────────────────────────────
const initialInterviewers = [
  { id: 1, name: "田中 誠",  role: "エンジニアリングマネージャー", avatar: "田", slots: [], slackHandle: "@tanaka.makoto" },
  { id: 2, name: "佐藤 花",  role: "シニアエンジニア",             avatar: "佐", slots: [], slackHandle: "@sato.hana" },
  { id: 3, name: "山本 剛",  role: "人事担当",                     avatar: "山", slots: [], slackHandle: "@yamamoto.go" },
];

const initialCandidates = [
  {
    id: 1, name: "鈴木 一郎", position: "フロントエンドエンジニア",
    stage: "一次面接", scheduleStatus: "proposed",
    timeline: [
      { stage: "書類選考",  date: "2/18", status: "done",     note: "書類通過",      comments: [{ interviewer: "山本 剛", avatar: "山", date: "2/18", text: "経歴・ポートフォリオともに水準を満たしている。React経験が豊富で期待できる。" }] },
      { stage: "一次面接",  date: "3/5",  status: "active",   note: "候補日程提示中", comments: [] },
      { stage: "二次面接",  date: "",     status: "upcoming",  note: "",              comments: [] },
      { stage: "最終面接",  date: "",     status: "upcoming",  note: "",              comments: [] },
      { stage: "内定",      date: "",     status: "upcoming",  note: "",              comments: [] },
    ],
  },
  {
    id: 2, name: "高橋 明美", position: "プロダクトマネージャー",
    stage: "二次面接", scheduleStatus: "interviewer_check",
    timeline: [
      { stage: "書類選考",  date: "2/10", status: "done",   note: "書類通過",      comments: [{ interviewer: "山本 剛", avatar: "山", date: "2/10", text: "PMとしての実績が明確。事業会社での経験が自社フェーズにマッチしている。" }] },
      { stage: "一次面接",  date: "2/20", status: "done",   note: "通過",          comments: [{ interviewer: "田中 誠", avatar: "田", date: "2/21", text: "論理的思考力が高く、プロダクト課題への解像度も十分。コミュニケーションも◎。" }, { interviewer: "佐藤 花", avatar: "佐", date: "2/21", text: "技術的な質問にも落ち着いて回答できていた。エンジニアとの協業経験も豊富そう。" }] },
      { stage: "二次面接",  date: "3/7",  status: "active", note: "面接官確認中",   comments: [] },
      { stage: "最終面接",  date: "",     status: "upcoming", note: "",             comments: [] },
      { stage: "内定",      date: "",     status: "upcoming", note: "",             comments: [] },
    ],
  },
  {
    id: 3, name: "渡辺 健太", position: "バックエンドエンジニア",
    stage: "最終面接", scheduleStatus: "confirmed",
    timeline: [
      { stage: "書類選考",  date: "1/28", status: "done",   note: "書類通過", comments: [{ interviewer: "山本 剛", avatar: "山", date: "1/28", text: "Go・Rustの実務経験があり、スケール要件に対応できそう。" }] },
      { stage: "一次面接",  date: "2/8",  status: "done",   note: "通過",     comments: [{ interviewer: "佐藤 花", avatar: "佐", date: "2/9",  text: "アーキテクチャ設計の質問に対して具体的かつ深い回答。即戦力として申し分ない。" }] },
      { stage: "二次面接",  date: "2/22", status: "done",   note: "通過",     comments: [{ interviewer: "田中 誠", avatar: "田", date: "2/23", text: "チームへのフィット感も高い。技術力・人柄ともに最終に進める価値あり。" }, { interviewer: "佐藤 花", avatar: "佐", date: "2/23", text: "パフォーマンスチューニングの実績が印象的だった。ぜひ最終へ。" }] },
      { stage: "最終面接",  date: "3/10", status: "active", note: "10:00 確定済", comments: [] },
      { stage: "内定",      date: "",     status: "upcoming", note: "",           comments: [] },
    ],
  },
];

const timeSlots = ["09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];

function getDaysFromNow(n) {
  const days = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
  }
  return days.slice(0, 5);
}
function formatDate(date) {
  return `${date.getMonth()+1}/${date.getDate()}(${["日","月","火","水","木","金","土"][date.getDay()]})`;
}
function todayStr() { const d = new Date(); return `${d.getMonth()+1}/${d.getDate()}`; }

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function Tag({ children, color = "#6366f1" }) {
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}33`,
      borderRadius: 6, padding: "2px 9px", fontSize: 11,
      fontFamily: FONT_BODY, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Avatar({ label, size = 36, color = "#6366f1" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: size * 0.38,
      flexShrink: 0,
    }}>{label}</div>
  );
}

function Notification({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: C.green, color: "#fff", borderRadius: 12, padding: "13px 20px",
      fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13,
      boxShadow: "0 8px 28px rgba(22,163,74,0.3)", display: "flex", alignItems: "center", gap: 8,
      animation: "slideIn 0.3s ease",
    }}>✓ {msg}</div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────
const SCHED_LABELS = {
  awaiting_proposal: "候補日程提示待ち",
  proposed:          "候補日程提示中",
  interviewer_check: "面接官確認中",
  confirmed:         "日程確定",
  done:              "選考完了",
};
const SCHED_COLORS = {
  awaiting_proposal: C.red,
  proposed:          C.yellow,
  interviewer_check: C.pink,
  confirmed:         C.green,
  done:              C.muted,
};

// ── CandidateTimeline modal ───────────────────────────────────────────────────
function CandidateTimeline({ candidate, interviewers, onAdvance, onUpdateTimeline, onClose }) {
  const [expandedStep, setExpandedStep]       = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showEditFlow, setShowEditFlow]         = useState(false);
  const [editStages, setEditStages]             = useState(candidate.timeline.map(s => s.stage));
  const [newStageName, setNewStageName]         = useState("");
  const [commentInterviewer, setCommentInterviewer] = useState(interviewers[0]?.name || "");
  const [commentText, setCommentText]           = useState("");

  const pc       = posColor(candidate.position);
  const stages   = candidate.timeline.map(s => s.stage);
  const nextStage = stages[stages.indexOf(candidate.stage) + 1];

  const stageNodeColor = (step) => {
    if (step.status === "done")    return C.green;
    if (step.status === "active")  return pc.main;
    return C.border;
  };

  const handleAdvance = () => {
    const comment = commentText.trim()
      ? { interviewer: commentInterviewer, avatar: commentInterviewer[0], date: todayStr(), text: commentText.trim() }
      : null;
    onAdvance(candidate.id, comment);
    onClose();
  };

  const handleSaveFlow = () => {
    // Build new timeline preserving existing data where stage names match
    const newTimeline = editStages.map(stageName => {
      const existing = candidate.timeline.find(s => s.stage === stageName);
      if (existing) return existing;
      return { stage: stageName, date: "", status: "upcoming", note: "", comments: [] };
    });
    // Re-derive statuses: keep done/active as-is, reset added ones
    onUpdateTimeline(candidate.id, newTimeline);
    setShowEditFlow(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 20, width: 640, maxWidth: "96vw",
        maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        border: `1px solid ${C.border}`,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 14,
          background: pc.light, borderRadius: "20px 20px 0 0",
        }}>
          <Avatar label={candidate.name[0]} size={48} color={pc.main} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 19, color: C.text }}>{candidate.name}</div>
            <div style={{ fontSize: 12, color: pc.main, marginTop: 2, fontWeight: 600 }}>{candidate.position}</div>
          </div>
          <button onClick={() => setShowEditFlow(!showEditFlow)} style={{
            background: showEditFlow ? pc.main : C.surface, border: `1px solid ${showEditFlow ? pc.main : C.border}`,
            borderRadius: 8, padding: "6px 14px", cursor: "pointer",
            fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
            color: showEditFlow ? "#fff" : C.muted,
          }}>✏️ フロー編集</button>
          <button onClick={onClose} style={{
            background: C.card, border: "none", color: C.muted,
            borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 15,
          }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px" }}>

          {/* Flow editor */}
          {showEditFlow && (
            <div style={{
              background: C.card, border: `1px solid ${pc.main}33`,
              borderRadius: 14, padding: "18px 20px", marginBottom: 24,
            }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>選考フローを編集</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>ステージの追加・削除・並び替えができます。完了済みのステージは削除しないでください。</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {editStages.map((s, i) => {
                  const orig = candidate.timeline.find(t => t.stage === s);
                  const locked = orig && orig.status !== "upcoming";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: 12, color: C.muted, width: 18, textAlign: "center" }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontFamily: FONT_BODY, color: C.text }}>{s}</span>
                      {locked && <Tag color={C.muted}>変更不可</Tag>}
                      {!locked && (
                        <div style={{ display: "flex", gap: 4 }}>
                          {i > 0 && !candidate.timeline.find(t => t.stage === editStages[i-1] && t.status !== "upcoming") && (
                            <button onClick={() => {
                              const a = [...editStages]; [a[i-1], a[i]] = [a[i], a[i-1]]; setEditStages(a);
                            }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14 }}>↑</button>
                          )}
                          {i < editStages.length - 1 && (
                            <button onClick={() => {
                              const a = [...editStages]; [a[i], a[i+1]] = [a[i+1], a[i]]; setEditStages(a);
                            }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14 }}>↓</button>
                          )}
                          <button onClick={() => setEditStages(editStages.filter((_, idx) => idx !== i))}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 14 }}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add stage */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder="新しいステージ名を入力..."
                  style={{
                    flex: 1, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 13,
                    outline: "none", color: C.text, background: C.surface,
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && newStageName.trim()) { setEditStages([...editStages, newStageName.trim()]); setNewStageName(""); } }}
                />
                <button onClick={() => { if (newStageName.trim()) { setEditStages([...editStages, newStageName.trim()]); setNewStageName(""); } }}
                  style={{
                    background: pc.main, color: "#fff", border: "none", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13,
                  }}>追加</button>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setShowEditFlow(false); setEditStages(candidate.timeline.map(s => s.stage)); }} style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "8px 16px", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, color: C.muted,
                }}>キャンセル</button>
                <button onClick={handleSaveFlow} style={{
                  background: pc.main, color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 20px", cursor: "pointer", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13,
                }}>保存する</button>
              </div>
            </div>
          )}

          {/* Timeline steps */}
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 19, top: 20, bottom: 20,
              width: 2, background: C.border, zIndex: 0,
            }} />
            {candidate.timeline.map((step, i) => {
              const isDone   = step.status === "done";
              const isActive = step.status === "active";
              const dotColor = stageNodeColor(step);
              const hasComments = step.comments?.length > 0;
              const isExpanded  = expandedStep === i;
              return (
                <div key={i} style={{
                  display: "flex", gap: 18, marginBottom: i < candidate.timeline.length - 1 ? 20 : 0,
                  position: "relative", zIndex: 1,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: isDone ? "#dcfce7" : isActive ? pc.light : C.card,
                    border: `2px solid ${dotColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isDone ? 14 : 10, color: dotColor, fontWeight: 700,
                  }}>
                    {isDone ? "✓" : isActive ? "●" : "○"}
                  </div>
                  <div style={{ flex: 1, paddingTop: 9 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: FONT, fontWeight: 700, fontSize: 14,
                        color: isActive ? pc.main : isDone ? C.text : C.muted,
                      }}>{step.stage}</span>
                      {step.date && <span style={{ fontSize: 11, color: C.muted }}>{step.date}</span>}
                      {isActive && <Tag color={pc.main}>進行中</Tag>}
                      {isDone   && <Tag color={C.green}>完了</Tag>}
                      {hasComments && (
                        <button onClick={() => setExpandedStep(isExpanded ? null : i)} style={{
                          background: "none", border: `1px solid ${C.border}`,
                          borderRadius: 6, padding: "2px 8px", cursor: "pointer",
                          fontSize: 11, color: C.muted, fontFamily: FONT_BODY,
                          display: "flex", alignItems: "center", gap: 3,
                        }}>💬 {step.comments.length}件 {isExpanded ? "▲" : "▼"}</button>
                      )}
                    </div>
                    {step.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{step.note}</div>}
                    {isExpanded && hasComments && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        {step.comments.map((cm, ci) => (
                          <div key={ci} style={{
                            background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 10, padding: "10px 14px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                              <Avatar label={cm.avatar} size={22} color={pc.main} />
                              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: C.text }}>{cm.interviewer}</span>
                              <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{cm.date}</span>
                            </div>
                            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{cm.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advance button */}
          {candidate.stage !== stages[stages.length - 1] && !showAdvanceModal && (
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdvanceModal(true)} style={{
                background: pc.main, color: "#fff", border: "none", borderRadius: 10,
                padding: "11px 22px", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 14,
                cursor: "pointer", boxShadow: `0 4px 16px ${pc.main}44`,
              }}>次のステージへ進める →</button>
            </div>
          )}

          {/* Advance form */}
          {showAdvanceModal && (
            <div style={{
              marginTop: 20, background: pc.light,
              border: `1px solid ${pc.main}33`, borderRadius: 14, padding: "20px 22px",
            }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 3 }}>
                「{nextStage}」へ進める
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>コメントを残せます（任意）</div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>面接官</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {interviewers.map(iv => (
                    <button key={iv.name} onClick={() => setCommentInterviewer(iv.name)} style={{
                      background: commentInterviewer === iv.name ? pc.main : C.surface,
                      border: `1px solid ${commentInterviewer === iv.name ? pc.main : C.border}`,
                      borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                      fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
                      color: commentInterviewer === iv.name ? "#fff" : C.text,
                      display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
                    }}>
                      <Avatar label={iv.avatar} size={17} color={pc.main} />
                      {iv.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>選考コメント（任意）</div>
                <textarea
                  value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="面接の所感、評価ポイントなど..."
                  rows={3}
                  style={{
                    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "10px 13px", color: C.text,
                    fontFamily: FONT_BODY, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6,
                  }}
                  onFocus={e => e.target.style.borderColor = pc.main}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setShowAdvanceModal(false); setCommentText(""); }} style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "8px 16px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13,
                  color: C.muted, cursor: "pointer",
                }}>キャンセル</button>
                <button onClick={handleAdvance} style={{
                  background: pc.main, color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 20px", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13,
                  cursor: "pointer", boxShadow: `0 3px 12px ${pc.main}44`,
                }}>確定して進める ✓</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App({ session, onLogout }) {
  const days = getDaysFromNow(7);
  const [tab, setTab]                                 = useState("schedule");
  const [interviewers, setInterviewers]               = useState([]);
  const [candidates, setCandidates]                   = useState([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState(null);
  const [notification, setNotification]               = useState(null);
  const [proposedSlots, setProposedSlots]             = useState({});
  const [timelineCandidate, setTimelineCandidate]     = useState(null);
  const [positionFilter, setPositionFilter]           = useState("全て");
  const [reminderTab, setReminderTab]                 = useState("all");
  const [reminderInterviewer, setReminderInterviewer] = useState("all");
  const [reminders, setReminders]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarSynced, setCalendarSynced]   = useState(false);

  // ── Supabase: 初回データ読み込み ──────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [{ data: ivData }, { data: cData }, { data: rData }] = await Promise.all([
        supabase.from("interviewers").select("*").order("created_at"),
        supabase.from("candidates").select("*").order("created_at"),
        supabase.from("reminders").select("*").order("created_at", { ascending: false }),
      ]);

      if (ivData?.length) {
        setInterviewers(ivData.map(iv => ({ ...iv, slots: iv.slots || [] })));
        setSelectedInterviewer(ivData[0].id);
      } else {
        // DBが空なら初期データをinsert
        const { data: inserted } = await supabase
          .from("interviewers").insert(initialInterviewers.map(iv => ({
            name: iv.name, role: iv.role, avatar: iv.avatar,
            slack_handle: iv.slackHandle, slots: iv.slots,
          }))).select();
        if (inserted) {
          setInterviewers(inserted.map(iv => ({ ...iv, slots: iv.slots || [], slackHandle: iv.slack_handle })));
          setSelectedInterviewer(inserted[0].id);
        }
      }

      if (cData?.length) {
        setCandidates(cData.map(c => ({ ...c, scheduleStatus: c.schedule_status, timeline: c.timeline || [] })));
      } else {
        const { data: inserted } = await supabase
          .from("candidates").insert(initialCandidates.map(c => ({
            name: c.name, position: c.position, stage: c.stage,
            schedule_status: c.scheduleStatus, timeline: c.timeline,
          }))).select();
        if (inserted) setCandidates(inserted.map(c => ({ ...c, scheduleStatus: c.schedule_status, timeline: c.timeline || [] })));
      }

      if (rData?.length) {
        setReminders(rData);
      } else {
        const seedReminders = [
          { text: "一次面接の候補日程を提示済み。応募者の返答をお待ちください。",         type: "proposed",          candidate: "鈴木 一郎", interviewer: null },
          { text: "二次面接の日程について最終確認をお願いします。",                        type: "interviewer_check", candidate: "高橋 明美", interviewer: "田中 誠" },
          { text: "最終面接（3/10 10:00）の実施をお待ちください。準備をご確認ください。", type: "interview_pending", candidate: "渡辺 健太", interviewer: "田中 誠" },
          { text: "一次面接が完了しました。選考コメントの入力をお願いします。",            type: "comment_needed",    candidate: "高橋 明美", interviewer: "佐藤 花" },
        ];
        const { data: inserted } = await supabase.from("reminders").insert(seedReminders).select();
        if (inserted) setReminders(inserted);
      }

      setLoading(false);
    }
    fetchAll();
  }, []);

  // ── Supabase: 面接官スロット更新 ─────────────────────────────────────────
  const syncInterviewerSlots = async (id, slots) => {
    await supabase.from("interviewers").update({ slots }).eq("id", id);
  };

  // ── Supabase: 応募者更新 ─────────────────────────────────────────────────
  const syncCandidate = async (candidate) => {
    await supabase.from("candidates").update({
      stage: candidate.stage,
      schedule_status: candidate.scheduleStatus,
      timeline: candidate.timeline,
    }).eq("id", candidate.id);
  };

  // ── Supabase: リマインダー追加 ───────────────────────────────────────────
  const addReminder = async (reminder) => {
    const { data } = await supabase.from("reminders").insert(reminder).select().single();
    if (data) setReminders(prev => [data, ...prev]);
  };

  // ── Supabase: リマインダー削除 ───────────────────────────────────────────
  const deleteReminder = async (id) => {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const notify = (msg) => setNotification(msg);

  // ── Google Calendar から空き枠を自動取得 ─────────────────────────────────
  const syncCalendar = async () => {
    setCalendarLoading(true);
    try {
      // Supabaseセッションからprovider_token（GoogleのOAuthトークン）を取得
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        notify("Googleカレンダーの権限がありません。一度ログアウトして再ログインしてください。");
        setCalendarLoading(false);
        return;
      }

      const res = await fetch(`/api/calendar-slots?access_token=${accessToken}&days=5`);
      const data = await res.json();

      if (!res.ok || !data.slots) {
        notify("カレンダーの取得に失敗しました");
        setCalendarLoading(false);
        return;
      }

      // ログインユーザーの名前でマッチする面接官を探してスロットを更新
      const userName = session?.user?.user_metadata?.name || session?.user?.email || "";
      const matched  = interviewers.find(iv =>
        userName.includes(iv.name.replace(" ", "")) ||
        iv.name.split(" ").some(n => userName.includes(n))
      );

      if (matched) {
        const newSlots = data.slots.map(s => `${s.dateKey}-${s.timeKey}`);
        setInterviewers(prev => prev.map(iv => {
          if (iv.id !== matched.id) return iv;
          syncInterviewerSlots(iv.id, newSlots);
          return { ...iv, slots: newSlots };
        }));
        notify(`${matched.name} のカレンダーから ${data.slots.length} 枠を取得しました 📅`);
      } else {
        // マッチしない場合は選択中の面接官に反映
        const newSlots = data.slots.map(s => `${s.dateKey}-${s.timeKey}`);
        setInterviewers(prev => prev.map(iv => {
          if (iv.id !== selectedInterviewer) return iv;
          syncInterviewerSlots(iv.id, newSlots);
          return { ...iv, slots: newSlots };
        }));
        notify(`カレンダーから ${data.slots.length} 枠を取得しました 📅`);
      }
      setCalendarSynced(true);
    } catch (err) {
      notify("カレンダーの取得中にエラーが発生しました");
    }
    setCalendarLoading(false);
  };
  const avatarColors = ["#2563eb", "#7c3aed", "#0891b2"];

  const allPositions = ["全て", ...Array.from(new Set(candidates.map(c => c.position)))];
  const filteredCandidates = positionFilter === "全て" ? candidates : candidates.filter(c => c.position === positionFilter);

  const toggleSlot = (interviewerId, day, time) => {
    setInterviewers(prev => prev.map(iv => {
      if (iv.id !== interviewerId) return iv;
      const key = `${formatDate(day)}-${time}`;
      const slots = iv.slots.includes(key) ? iv.slots.filter(s => s !== key) : [...iv.slots, key];
      syncInterviewerSlots(interviewerId, slots);
      return { ...iv, slots };
    }));
  };

  const getCommonSlots = () => {
    const allSlots = interviewers.map(iv => new Set(iv.slots));
    const common = [];
    days.forEach(day => timeSlots.forEach(time => {
      const key = `${formatDate(day)}-${time}`;
      const count = allSlots.filter(s => s.has(key)).length;
      if (count >= 2) common.push({ key, day, time, count });
    }));
    return common.slice(0, 6);
  };

  const proposeToCandidate = (candidateId) => {
    const common = getCommonSlots();
    if (!common.length) { notify("先に面接官の空き時間を登録してください"); return; }
    setProposedSlots(prev => ({ ...prev, [candidateId]: common.slice(0, 3) }));
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const updated = { ...c, scheduleStatus: "proposed" };
      syncCandidate(updated);
      return updated;
    }));
    notify("候補日程を応募者に送信しました 📧");
  };

  const confirmSlot = (candidateId, slot) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const updated = { ...c, scheduleStatus: "confirmed", confirmedSlot: slot.key };
      syncCandidate(updated);
      return updated;
    }));
    const cand = candidates.find(c => c.id === candidateId);
    addReminder({ text: `面接が確定しました（${slot.time} ${formatDate(slot.day)}）。準備をご確認ください。`, type: "interview_pending", candidate: cand?.name, interviewer: null });
    notify(`面接日程が確定しました！ ${slot.time} ${formatDate(slot.day)} 🎉`);
  };

  const advanceStage = (candidateId, comment = null) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const stages   = c.timeline.map(s => s.stage);
      const curIdx   = stages.indexOf(c.stage);
      if (curIdx >= stages.length - 1) return c;
      const nextStage = stages[curIdx + 1];
      const newTimeline = c.timeline.map(step => {
        if (step.status === "active") {
          const updatedComments = comment ? [...(step.comments || []), comment] : (step.comments || []);
          return { ...step, status: "done", note: step.note || "通過", comments: updatedComments };
        }
        if (step.stage === nextStage) return { ...step, status: "active", date: todayStr(), note: "進行中" };
        return step;
      });
      const updated = { ...c, stage: nextStage, scheduleStatus: "awaiting_proposal", timeline: newTimeline };
      syncCandidate(updated);
      return updated;
    }));
    const cand = candidates.find(c => c.id === candidateId);
    const stages = cand?.timeline.map(s => s.stage) || DEFAULT_STAGES;
    const next = stages[stages.indexOf(cand?.stage) + 1];
    notify(`${cand?.name} を「${next}」へ進めました 🎉`);
    if (!comment) {
      addReminder({ text: `${cand?.stage}が完了しました。選考コメントの入力をお願いします。`, type: "comment_needed", candidate: cand?.name, interviewer: null });
    }
  };

  const updateTimeline = (candidateId, newTimeline) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const activeStage = newTimeline.find(s => s.status === "active")?.stage || c.stage;
      const updated = { ...c, timeline: newTimeline, stage: activeStage };
      syncCandidate(updated);
      return updated;
    }));
    setTimelineCandidate(prev => prev ? {
      ...prev,
      timeline: newTimeline,
      stage: newTimeline.find(s => s.status === "active")?.stage || prev.stage
    } : prev);
    notify("選考フローを更新しました ✓");
  };

  const interviewer = interviewers.find(iv => iv.id === selectedInterviewer);
  const commonSlots = getCommonSlots();

  const TABS = [
    { id: "schedule",   label: "スケジュール" },
    { id: "candidates", label: "応募者管理" },
    { id: "reminders",  label: `リマインダー${reminders.length ? ` (${reminders.length})` : ""}` },
  ];

  // ── Shared sub-tab renderer ──
  const PositionTabs = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
      {allPositions.map(pos => {
        const pc  = pos === "全て" ? null : posColor(pos);
        const active = value === pos;
        return (
          <button key={pos} onClick={() => onChange(pos)} style={{
            background: active ? (pc ? pc.main : C.text) : C.surface,
            border: `1px solid ${active ? (pc ? pc.main : C.text) : C.border}`,
            borderRadius: 8, padding: "6px 16px", cursor: "pointer",
            fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12,
            color: active ? "#fff" : C.muted, transition: "all 0.15s",
          }}>
            {pos === "全て" ? "全て" : (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: pc?.main, display: "inline-block" }} />
                {pos} ({candidates.filter(c => c.position === pos).length})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <svg width="46" height="28" viewBox="0 0 46 28" fill="none">
        <rect width="46" height="28" rx="9" fill="url(#lgL)"/>
        <path d="M7 16 C11.5 16 11.5 11 17 11 C22.5 11 22.5 17 28 17 C33.5 17 33.5 12 38 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <circle cx="38.5" cy="12" r="2.4" fill="white"/>
        <defs><linearGradient id="lgL" x1="0" y1="0" x2="46" y2="28" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#2563eb"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient></defs>
      </svg>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.muted }}>読み込み中...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        @keyframes slideIn { from { transform: translateX(50px); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes fadeUp  { from { transform: translateY(12px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        .slot-btn:hover  { background: #eff6ff !important; border-color: #2563eb !important; }
        .slot-btn.active { background: #dbeafe !important; border-color: #2563eb !important; color: #2563eb !important; }
        .tab-btn { transition: all 0.18s; }
        .tab-btn.active { color: ${C.text} !important; border-bottom: 2px solid ${C.text} !important; font-weight: 700 !important; }
        .cand-card { transition: all 0.15s; }
        .cand-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important; transform: translateY(-1px); }
        .act-btn { transition: all 0.15s; }
        .act-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        textarea:focus { outline: none; }
        input:focus { outline: none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          {/* Icon: pill with single wave + endpoint dot */}
          <svg width="46" height="28" viewBox="0 0 46 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="46" height="28" rx="9" fill="url(#lgWave)"/>
            <path
              d="M7 16 C11.5 16 11.5 11 17 11 C22.5 11 22.5 17 28 17 C33.5 17 33.5 12 38 12"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"
            />
            <circle cx="38.5" cy="12" r="2.4" fill="white"/>
            <defs>
              <linearGradient id="lgWave" x1="0" y1="0" x2="46" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563eb"/>
                <stop offset="100%" stopColor="#6d28d9"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Wordmark: thin geometric SVG lettering */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <svg width="72" height="20" viewBox="0 0 72 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* H */}
              <line x1="1.5" y1="2" x2="1.5" y2="18" stroke="#1a1d2e" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="8.5" y1="2" x2="8.5" y2="18" stroke="#1a1d2e" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="1.5" y1="10" x2="8.5" y2="10" stroke="#1a1d2e" strokeWidth="1.8" strokeLinecap="round"/>
              {/* a */}
              <path d="M13 9.5 Q13 7.5 16.5 7.5 Q20 7.5 20 10.5 L20 18" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M20 13.5 Q17 12.5 13.5 13.5 Q12 14.5 12.5 16.5 Q13 18.5 16 18.5 Q19.5 18.5 20 16.5" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              {/* k */}
              <line x1="24.5" y1="2" x2="24.5" y2="18" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M24.5 12.5 L30 7.5" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M26.5 13.5 L30.5 18" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round"/>
              {/* o */}
              <ellipse cx="36" cy="13" rx="3.8" ry="5.2" stroke="#1a1d2e" strokeWidth="1.7"/>
              {/* b */}
              <line x1="43.5" y1="2" x2="43.5" y2="18" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M43.5 8.5 Q44.5 7.5 47 7.5 Q51 7.5 51 13 Q51 18.5 47 18.5 Q44.5 18.5 43.5 17.5" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              {/* i */}
              <circle cx="55.5" cy="4" r="1.4" fill="#2563eb"/>
              <line x1="55.5" y1="8" x2="55.5" y2="18" stroke="#1a1d2e" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            <div style={{
              fontSize: 9.5, color: C.muted, letterSpacing: "0.06em",
              fontFamily: FONT_BODY, fontWeight: 400, paddingLeft: 1,
              whiteSpace: "nowrap",
            }}>面接調整、もっとスムーズに</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", borderBottom: "2px solid transparent",
              color: tab === t.id ? C.text : C.muted,
              fontFamily: FONT_BODY, fontWeight: 500, fontSize: 13,
              padding: "0 16px", height: 64, cursor: "pointer",
            }}>{t.label}</button>
          ))}
          </div>
          {/* ユーザー情報 + ログアウト */}
          {session && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
              {session.user?.user_metadata?.avatar_url && (
                <img src={session.user.user_metadata.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.border}` }} />
              )}
              <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.user?.user_metadata?.name || session.user?.email}
              </span>
              <button onClick={onLogout} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 7,
                padding: "4px 10px", cursor: "pointer", fontSize: 11, color: C.muted,
                fontFamily: FONT_BODY, fontWeight: 600,
              }}>ログアウト</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

        {/* ══ Schedule ══ */}
        {tab === "schedule" && (
          <div style={{ animation: "fadeUp 0.25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: 22 }}>
              {/* Left panel */}
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>面接官</div>
                {interviewers.map((iv, i) => (
                  <div key={iv.id} onClick={() => setSelectedInterviewer(iv.id)} style={{
                    background: selectedInterviewer === iv.id ? C.card : C.surface,
                    border: `1px solid ${selectedInterviewer === iv.id ? avatarColors[i] + "66" : C.border}`,
                    borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                    cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10,
                    boxShadow: selectedInterviewer === iv.id ? C.shadow : "none",
                  }}>
                    <Avatar label={iv.avatar} size={36} color={avatarColors[i]} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{iv.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{iv.role}</div>
                    </div>
                    <Tag color={iv.slots.length > 0 ? C.green : C.yellow}>{iv.slots.length}枠</Tag>
                  </div>
                ))}

                {/* Common slots */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 6 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>共通空き枠</div>
                  {commonSlots.length === 0
                    ? <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "10px 0" }}>2名以上が空いている時間をここに表示</div>
                    : commonSlots.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < commonSlots.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <span style={{ fontSize: 12, color: C.text }}>{formatDate(s.day)} {s.time}</span>
                        <Tag color={s.count >= 3 ? C.green : "#2563eb"}>{s.count}名</Tag>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Calendar */}
              <div>
                <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, color: C.text }}>{interviewer?.name} の空き時間</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>クリックして空き時間を登録・解除</div>
                  </div>
                  {/* Google Calendar 同期ボタン */}
                  <button
                    onClick={syncCalendar}
                    disabled={calendarLoading}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      background: calendarSynced ? "#f0fdf4" : "#fff",
                      border: `1px solid ${calendarSynced ? C.green : C.border}`,
                      borderRadius: 10, padding: "8px 16px", cursor: calendarLoading ? "default" : "pointer",
                      fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13,
                      color: calendarSynced ? C.green : C.text,
                      boxShadow: C.shadow, transition: "all 0.15s",
                    }}
                  >
                    {calendarLoading ? (
                      <>⏳ 取得中...</>
                    ) : calendarSynced ? (
                      <>✓ カレンダー同期済み</>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="18" rx="3" stroke="#2563eb" strokeWidth="2"/>
                          <path d="M3 9h18" stroke="#2563eb" strokeWidth="2"/>
                          <path d="M8 2v4M16 2v4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="8" cy="14" r="1.5" fill="#2563eb"/>
                          <circle cx="12" cy="14" r="1.5" fill="#2563eb"/>
                          <circle cx="16" cy="14" r="1.5" fill="#2563eb"/>
                        </svg>
                        Googleカレンダーから取得
                      </>
                    )}
                  </button>
                </div>
                <div style={{ overflowX: "auto", background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 56, color: C.muted, fontFamily: FONT, fontSize: 10, textAlign: "left", paddingBottom: 8 }}></th>
                        {days.map(day => (
                          <th key={day.toISOString()} style={{ color: C.text, fontFamily: FONT, fontWeight: 700, fontSize: 11, textAlign: "center", paddingBottom: 8, minWidth: 78 }}>{formatDate(day)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(time => (
                        <tr key={time}>
                          <td style={{ color: C.muted, fontSize: 11, paddingRight: 6, whiteSpace: "nowrap" }}>{time}</td>
                          {days.map(day => {
                            const key    = `${formatDate(day)}-${time}`;
                            const active = interviewer?.slots.includes(key);
                            const isCommon = commonSlots.find(s => s.key === key);
                            return (
                              <td key={day.toISOString()} style={{ textAlign: "center" }}>
                                <button className={`slot-btn ${active ? "active" : ""}`} onClick={() => toggleSlot(selectedInterviewer, day, time)} style={{
                                  width: "100%", height: 32, borderRadius: 6,
                                  border: `1px solid ${active ? "#2563eb" : C.border}`,
                                  background: active ? "#dbeafe" : C.bg,
                                  color: active ? "#2563eb" : C.muted,
                                  cursor: "pointer", fontSize: 13,
                                  outline: isCommon ? `2px solid ${C.green}44` : "none",
                                }}>{active ? "✓" : ""}</button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ Candidates ══ */}
        {tab === "candidates" && (
          <div style={{ animation: "fadeUp 0.25s ease" }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, color: C.text, marginBottom: 16 }}>応募者管理</div>
            <PositionTabs value={positionFilter} onChange={setPositionFilter} />
            <div style={{ display: "grid", gap: 12 }}>
              {filteredCandidates.map(c => {
                const pc = posColor(c.position);
                return (
                  <div key={c.id} className="cand-card" style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: 16,
                    boxShadow: C.shadow,
                  }}>
                    {/* Position color stripe */}
                    <div style={{ width: 4, height: 56, borderRadius: 99, background: pc.main, flexShrink: 0 }} />
                    <Avatar label={c.name[0]} size={42} color={pc.main} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, color: C.text }}>{c.name}</span>
                        <Tag color={SCHED_COLORS[c.scheduleStatus]}>{SCHED_LABELS[c.scheduleStatus]}</Tag>
                        <Tag color={pc.main}>{c.stage}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{c.position}</div>
                      {/* Position-colored progress bar: stage-based shading */}
                      <div style={{ display: "flex", gap: 3 }}>
                        {c.timeline.map((step, i) => {
                          if (step.status === "upcoming") {
                            return <div key={i} style={{ height: 5, flex: 1, borderRadius: 99, background: pc.light, border: `1px solid ${pc.mid}`, transition: "background 0.3s" }} />;
                          }
                          const s = step.stage;
                          const isOffer     = s === "内定";
                          const isScreening = s === "書類選考";
                          // 面接ステージのインデックス（薄→濃）
                          const interviewStages = c.timeline.filter(t => t.stage !== "書類選考" && t.stage !== "内定").map(t => t.stage);
                          const ivIdx = interviewStages.indexOf(s); // -1 if not interview
                          const ivTotal = interviewStages.length || 1;
                          // opacity 0.35 → 0.75 across interview stages
                          const ivOpacity = ivIdx >= 0 ? 0.35 + (ivIdx / (ivTotal - 1 || 1)) * 0.4 : 1;

                          const bg = isOffer     ? pc.main
                                   : isScreening ? pc.light
                                   : `color-mix(in srgb, ${pc.main} ${Math.round(ivOpacity * 100)}%, ${pc.light})`;
                          return <div key={i} style={{ height: 5, flex: 1, borderRadius: 99, background: bg, transition: "background 0.3s" }} />;
                        })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                      <button className="act-btn" onClick={() => setTimelineCandidate(c)} style={{
                        background: C.card, border: `1px solid ${C.border}`,
                        color: C.text, borderRadius: 8, padding: "7px 13px",
                        fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12, cursor: "pointer",
                      }}>📊 進捗を見る</button>
                      {c.scheduleStatus !== "confirmed" && c.scheduleStatus !== "done" && (
                        <button className="act-btn" onClick={() => proposeToCandidate(c.id)} style={{
                          background: pc.main, color: "#fff", border: "none", borderRadius: 8,
                          padding: "8px 16px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12, cursor: "pointer",
                        }}>候補日程を送る</button>
                      )}
                      {proposedSlots[c.id] && c.scheduleStatus !== "confirmed" && (
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 13px", minWidth: 210 }}>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 7, fontFamily: FONT, fontWeight: 700 }}>候補日程を選択</div>
                          {proposedSlots[c.id].map((slot, i) => (
                            <button key={i} className="act-btn" onClick={() => confirmSlot(c.id, slot)} style={{
                              display: "block", width: "100%", textAlign: "left",
                              background: C.surface, border: `1px solid ${C.border}`,
                              borderRadius: 6, padding: "6px 10px", marginBottom: 4,
                              fontFamily: FONT_BODY, fontSize: 12, color: C.text, cursor: "pointer",
                            }}>
                              {formatDate(slot.day)} {slot.time}
                              <span style={{ color: C.muted, marginLeft: 5 }}>({slot.count}名)</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ Reminders ══ */}
        {tab === "reminders" && (() => {
          const REMINDER_TABS = [
            { id: "all",               label: "すべて",           icon: "🔔" },
            { id: "proposed",          label: "候補日程提示中",   icon: "📤" },
            { id: "interviewer_check", label: "面接官確認中",     icon: "👀" },
            { id: "interview_pending", label: "面接実施待ち",     icon: "📅" },
            { id: "comment_needed",    label: "コメント入力待ち", icon: "💬" },
          ];
          const REMINDER_COLORS = {
            proposed:          { border: C.yellow,   bg: "#fffbeb", icon: "📤" },
            interviewer_check: { border: "#db2777",  bg: "#fdf2f8", icon: "👀" },
            interview_pending: { border: "#2563eb",  bg: "#eff6ff", icon: "📅" },
            comment_needed:    { border: "#0891b2",  bg: "#ecfeff", icon: "💬" },
          };

          // フィルタリング: カテゴリ × 面接官
          const categoryFiltered = reminderTab === "all" ? reminders : reminders.filter(r => r.type === reminderTab);
          const filtered = reminderInterviewer === "all"
            ? categoryFiltered
            : categoryFiltered.filter(r => r.interviewer === reminderInterviewer);

          // Slack メッセージ生成
          const buildSlackMessage = (r) => {
            const iv = interviewers.find(i => i.name === r.interviewer);
            const mention = iv?.slackHandle || r.interviewer || "";
            const label = REMINDER_TABS.find(t => t.id === r.type)?.label || "";
            return `${mention} 【${label}】${r.candidate ? `候補者: ${r.candidate}　` : ""}${r.text}`;
          };

          const handleSlackSend = (r) => {
            const msg = buildSlackMessage(r);
            // Slack Webhook / Deep-link: デモとしてクリップボードにコピー
            navigator.clipboard?.writeText(msg).catch(() => {});
            alert(`Slackに送信する内容をクリップボードにコピーしました:\n\n${msg}\n\n※本番実装時はSlack Webhook URLに POST します。`);
          };

          return (
            <div style={{ animation: "fadeUp 0.25s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, color: C.text }}>リマインダー</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8faff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px" }}>
                  <span style={{ fontSize: 16 }}>💬</span>
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY }}>Slack連携済み</span>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                </div>
              </div>

              {/* ── カテゴリタブ ── */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {REMINDER_TABS.map(rt => {
                  const count = rt.id === "all" ? reminders.length : reminders.filter(r => r.type === rt.id).length;
                  const isActive = reminderTab === rt.id;
                  return (
                    <button key={rt.id} onClick={() => setReminderTab(rt.id)} style={{
                      background: isActive ? C.text : C.surface,
                      border: `1px solid ${isActive ? C.text : C.border}`,
                      borderRadius: 8, padding: "7px 13px", cursor: "pointer",
                      fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12,
                      color: isActive ? "#fff" : C.muted, transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <span>{rt.icon}</span>
                      {rt.label}
                      {count > 0 && (
                        <span style={{
                          background: isActive ? "rgba(255,255,255,0.25)" : C.card,
                          borderRadius: 99, minWidth: 18, height: 18, padding: "0 5px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: isActive ? "#fff" : C.muted,
                        }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── 面接官タブ ── */}
              <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap", paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                {["all", ...interviewers.map(iv => iv.name)].map(name => {
                  const iv = interviewers.find(i => i.name === name);
                  const count = name === "all"
                    ? (reminderTab === "all" ? reminders : reminders.filter(r => r.type === reminderTab)).length
                    : (reminderTab === "all" ? reminders : reminders.filter(r => r.type === reminderTab)).filter(r => r.interviewer === name).length;
                  const isActive = reminderInterviewer === name;
                  return (
                    <button key={name} onClick={() => setReminderInterviewer(name)} style={{
                      background: isActive ? "#f0f4ff" : C.surface,
                      border: `1px solid ${isActive ? "#2563eb" : C.border}`,
                      borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                      fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12,
                      color: isActive ? "#2563eb" : C.muted, transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {iv
                        ? <Avatar label={iv.avatar} size={18} color="#2563eb" />
                        : <span>👥</span>
                      }
                      {name === "all" ? "全員" : name}
                      {count > 0 && (
                        <span style={{
                          background: isActive ? "#dbeafe" : C.card,
                          borderRadius: 99, minWidth: 17, height: 17, padding: "0 4px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: isActive ? "#2563eb" : C.muted,
                        }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── リマインダーカード ── */}
              {filtered.length === 0
                ? (
                  <div style={{ textAlign: "center", color: C.muted, padding: "60px 0", fontFamily: FONT, fontSize: 15 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                    このカテゴリのリマインダーはありません
                  </div>
                )
                : filtered.map(r => {
                  const rs = REMINDER_COLORS[r.type] || { border: C.muted, bg: C.surface, icon: "🔔" };
                  const iv = interviewers.find(i => i.name === r.interviewer);
                  // proposed → 候補者名を主表示、それ以外 → 面接官名を主表示
                  const isProposed = r.type === "proposed";
                  const primaryLabel  = isProposed ? r.candidate : (r.interviewer || null);
                  const primaryColor  = isProposed ? posColor(candidates.find(c => c.name === r.candidate)?.position)?.main || rs.border : "#2563eb";
                  const secondaryLabel = isProposed ? null : r.candidate;

                  return (
                    <div key={r.id} style={{
                      background: rs.bg, border: `1px solid ${rs.border}33`,
                      borderLeft: `3px solid ${rs.border}`,
                      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
                      boxShadow: C.shadow,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{rs.icon}</span>
                        <div style={{ flex: 1 }}>
                          {/* Primary label */}
                          {primaryLabel && (
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                              {!isProposed && iv && <Avatar label={iv.avatar} size={20} color="#2563eb" />}
                              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: primaryColor }}>{primaryLabel}</span>
                              {!isProposed && iv && <span style={{ fontSize: 11, color: C.muted }}>{iv.slackHandle}</span>}
                              {secondaryLabel && <Tag color={rs.border}>{secondaryLabel}</Tag>}
                            </div>
                          )}
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{r.text}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                          {/* Slack送信ボタン（面接官が紐づくもののみ） */}
                          {r.interviewer && (
                            <button onClick={() => handleSlackSend(r)} className="act-btn" style={{
                              background: "#4a154b", color: "#fff", border: "none",
                              borderRadius: 7, padding: "5px 12px", cursor: "pointer",
                              fontFamily: FONT_BODY, fontWeight: 600, fontSize: 11,
                              display: "flex", alignItems: "center", gap: 5,
                            }}>
                              <span style={{ fontSize: 13 }}>💬</span> Slackで送る
                            </button>
                          )}
                          <button onClick={() => deleteReminder(r.id)}
                            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          );
        })()}
      </div>

      {/* Timeline modal */}
      {timelineCandidate && (
        <CandidateTimeline
          candidate={timelineCandidate}
          interviewers={interviewers}
          onAdvance={(id, comment) => { advanceStage(id, comment); setTimelineCandidate(null); }}
          onUpdateTimeline={updateTimeline}
          onClose={() => setTimelineCandidate(null)}
        />
      )}

      {notification && <Notification msg={notification} onClose={() => setNotification(null)} />}
    </div>
  );
}
