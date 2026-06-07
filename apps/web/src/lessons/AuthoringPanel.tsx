import { useState, useMemo } from "react";
import type { ActivityTool, DragPolicy } from "@euclid/activity";
import type { ConstructionId, ConstructionProgram } from "@euclid/geometry";
import { compressLessonToUrlPayload } from "@euclid/lesson";
import { compileEuclidLesson, autoDetectStartersAndGoals } from "./authoring";

export type AuthoringPanelProps = Readonly<{
  program: ConstructionProgram;
  selectedIds: ReadonlySet<ConstructionId>;
  onClose: () => void;
}>;

export function AuthoringPanel({ program, selectedIds, onClose }: AuthoringPanelProps) {
  const [title, setTitle] = useState("Custom Activity");
  const [description, setDescription] = useState("Construct...");
  const [allowedTools, setAllowedTools] = useState<ActivityTool[]>(["select", "point", "line", "circle"]);
  const [pointDrag, setPointDrag] = useState<DragPolicy>("free-points");
  const [shapeDrag, setShapeDrag] = useState<DragPolicy>("none");

  // Track locked and goal IDs statefully
  const [lockedIds, setLockedIds] = useState<Set<ConstructionId>>(() => {
    // Lock free points by default as a sensible starter state
    return new Set(program.constructions.filter((c) => c.kind === "free-point").map((c) => c.id));
  });
  const [goalIds, setGoalIds] = useState<Set<ConstructionId>>(new Set());

  const handleToggleTool = (tool: ActivityTool) => {
    setAllowedTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));
  };

  const handleToggleLocked = (id: ConstructionId) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // An element cannot be both starter and goal
        goalIds.delete(id);
      }
      return next;
    });
  };

  const handleToggleGoal = (id: ConstructionId) => {
    setGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // An element cannot be both starter and goal
        lockedIds.delete(id);
      }
      return next;
    });
  };

  const handleAutoDetect = () => {
    const detected = autoDetectStartersAndGoals(program);
    setLockedIds(detected.lockedIds);
    setGoalIds(detected.goalIds);
  };

  const handleLockSelected = () => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.add(id);
      }
      return next;
    });
    setGoalIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.delete(id);
      }
      return next;
    });
  };

  const handleGoalSelected = () => {
    setGoalIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.add(id);
      }
      return next;
    });
    setLockedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.delete(id);
      }
      return next;
    });
  };

  const handleClearSelected = () => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.delete(id);
      }
      return next;
    });
    setGoalIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.delete(id);
      }
      return next;
    });
  };

  const compiledLesson = useMemo(() => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return compileEuclidLesson({
      id: slug || "custom-lesson",
      title,
      description,
      program,
      lockedIds,
      goalIds,
      allowedTools,
      pointDrag,
      shapeDrag,
    });
  }, [title, description, program, lockedIds, goalIds, allowedTools, pointDrag, shapeDrag]);

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(compiledLesson, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${compiledLesson.id}.lesson.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    try {
      const payload = compressLessonToUrlPayload(compiledLesson);
      const shareUrl = `${window.location.origin}${window.location.pathname}?lessonData=${payload}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Shareable link copied to clipboard!");
    } catch (err) {
      console.error(err);
      alert("Failed to copy link.");
    }
  };

  return (
    <div className="authoring-panel">
      <div className="authoring-header">
        <h3>Lesson Authoring</h3>
        <button type="button" className="close-authoring-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="authoring-field">
        <label htmlFor="auth-title">Activity Title</label>
        <input id="auth-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="authoring-field">
        <label htmlFor="auth-desc">Instructions for Student</label>
        <textarea
          id="auth-desc"
          value={description}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="authoring-field">
        <label>Allowed Tools</label>
        <div className="auth-tools-grid">
          {(
            ["select", "point", "line", "circle", "parallel", "perpendicular", "midpoint"] as ActivityTool[]
          ).map((tool) => (
            <label key={tool} className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={allowedTools.includes(tool)}
                onChange={() => handleToggleTool(tool)}
              />
              {tool}
            </label>
          ))}
        </div>
      </div>

      <div className="authoring-row">
        <div className="authoring-field">
          <label htmlFor="auth-pt-drag">Point Drag</label>
          <select
            id="auth-pt-drag"
            value={pointDrag}
            onChange={(e) => setPointDrag(e.target.value as DragPolicy)}
          >
            <option value="none">None</option>
            <option value="free-points">Free Points</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="authoring-field">
          <label htmlFor="auth-sh-drag">Shape Drag</label>
          <select
            id="auth-sh-drag"
            value={shapeDrag}
            onChange={(e) => setShapeDrag(e.target.value as DragPolicy)}
          >
            <option value="none">None</option>
            <option value="free-points">Free Points</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="authoring-field" style={{ gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          className="auth-btn magic-btn"
          style={{ background: "#2563eb", color: "#ffffff", border: "none" }}
          onClick={handleAutoDetect}
          disabled={program.constructions.length === 0}
        >
          🪄 Magic Auto-Detect (Starters & Goals)
        </button>

        {selectedIds.size > 0 && (
          <div
            className="auth-selection-helpers"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              background: "#0f1618",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #246a73",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "bold" }}>
              Selected on Canvas ({selectedIds.size})
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                className="reset-lesson-button"
                style={{ flex: 1, padding: "4px", fontSize: "0.7rem" }}
                onClick={handleLockSelected}
              >
                Set Locked
              </button>
              <button
                type="button"
                className="reset-lesson-button"
                style={{
                  flex: 1,
                  padding: "4px",
                  fontSize: "0.7rem",
                  color: "#34d399",
                  borderColor: "#065f46",
                }}
                onClick={handleGoalSelected}
              >
                Set Goal
              </button>
              <button
                type="button"
                className="reset-lesson-button"
                style={{ padding: "4px", fontSize: "0.7rem", color: "#fca5a5" }}
                onClick={handleClearSelected}
                title="Clear locked/goal status for selected items"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="authoring-field">
        <label>Constructions config</label>
        <p className="auth-helper">
          * Locked items form the starter workspace. Goals are what the student needs to construct.
        </p>
        <div className="auth-constructions-list">
          {program.constructions.length === 0 ? (
            <div className="auth-empty">Draw some points/lines first!</div>
          ) : (
            <table className="auth-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Locked</th>
                  <th>Goal</th>
                </tr>
              </thead>
              <tbody>
                {program.constructions.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`auth-badge kind-${c.kind}`}>{c.kind}</span>{" "}
                      <strong>{c.label || c.id}</strong>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={lockedIds.has(c.id)}
                        onChange={() => handleToggleLocked(c.id)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={goalIds.has(c.id)}
                        onChange={() => handleToggleGoal(c.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="auth-actions">
        <button
          type="button"
          className="auth-btn primary"
          onClick={handleExportJson}
          disabled={program.constructions.length === 0}
        >
          Download Lesson File
        </button>
        <button
          type="button"
          className="auth-btn secondary"
          onClick={handleCopyLink}
          disabled={program.constructions.length === 0}
        >
          Copy Shareable Link
        </button>
      </div>
    </div>
  );
}
