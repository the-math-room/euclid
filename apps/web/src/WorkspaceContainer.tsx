import {
  Circle,
  MousePointer2,
  Ruler,
  Waypoints,
  Undo2,
  Redo2,
  Trash2,
  Sliders,
  Equal,
  BetweenHorizonalEnd,
  Milestone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { evaluateConstruction, evaluateMeasurements, formatMeasurementValue } from "@euclid/geometry";
import type {
  ConstructionId,
  ConstructionProgram,
  MeasurementConstraintBehavior,
  MeasurementEvaluation,
  MeasurementIntent,
  SegmentLengthMeasurement,
} from "@euclid/geometry";
import { evaluateGoal, mapGoalIds, resolveGoalMapping } from "@euclid/assessment";
import { defaultScreenViewFor, sceneForEvaluation } from "@euclid/rendering";
import { useMemo, useState, useCallback } from "react";
import { useConstructionController } from "./construction/useConstructionController";
import { ObjectList } from "./objects/ObjectList";
import { SelectionDetails } from "./objects/SelectionDetails";
import { useCameraController } from "./view/useCameraController";
import { ViewControls } from "./view/ViewControls";
import { WorkspaceView } from "./WorkspaceView";
import { parseEuclidLesson, type EuclidLesson } from "@euclid/lesson";
import { AuthoringPanel } from "./lessons/AuthoringPanel";
import { constructionToolDescriptors, type ToolIconName } from "./construction/tools";

const sceneSize = { width: 920, height: 620 };

const toolbarIcons = {
  select: MousePointer2,
  point: Waypoints,
  line: Ruler,
  circle: Circle,
  parallel: Equal,
  perpendicular: BetweenHorizonalEnd,
  midpoint: Milestone,
  macro: Sparkles,
} satisfies Record<ToolIconName, LucideIcon>;

export type WorkspaceContainerProps = Readonly<{
  lessons: readonly EuclidLesson[];
  activeLesson: EuclidLesson;
  activeLessonIndex: number;
  setActiveLessonIndex: (index: number) => void;
  activeProgram: ConstructionProgram;
  onProgramChange: (program: ConstructionProgram) => void;
  onResetLesson: () => void;
  onLoadCustomLesson: (lesson: EuclidLesson) => void;
  sizeScale: number;
  setSizeScale: (s: number | ((prev: number) => number)) => void;
  isDrawerExpanded: boolean;
  setIsDrawerExpanded: (b: boolean) => void;
}>;

export function WorkspaceContainer({
  lessons,
  activeLesson,
  activeLessonIndex,
  setActiveLessonIndex,
  activeProgram,
  onProgramChange,
  onResetLesson,
  onLoadCustomLesson,
  sizeScale,
  setSizeScale,
  isDrawerExpanded,
  setIsDrawerExpanded,
}: WorkspaceContainerProps) {
  const [isAuthoringOpen, setIsAuthoringOpen] = useState(false);
  const [measurementExpressionDraft, setMeasurementExpressionDraft] = useState("x");
  const [measurementIntentDraft, setMeasurementIntentDraft] = useState<MeasurementIntent>("check");
  const [measurementVariableDraft, setMeasurementVariableDraft] = useState("x");
  const [measurementVariableValueDraft, setMeasurementVariableValueDraft] = useState("");

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text !== "string") return;

        const parsed = parseEuclidLesson(text);
        if (parsed.ok) {
          onLoadCustomLesson(parsed.lesson);
        } else {
          alert("Invalid lesson JSON:\n" + parsed.diagnostics.join("\n"));
        }
      };
      reader.readAsText(file);
    },
    [onLoadCustomLesson],
  );

  const defaultView = useMemo(() => {
    const evaluatedStarter = evaluateConstruction(activeLesson.document.program);
    return defaultScreenViewFor(evaluatedStarter, sceneSize);
  }, [activeLesson]);

  const camera = useCameraController(defaultView);

  const construction = useConstructionController({
    initialProgram: activeProgram,
    camera: camera.camera,
    sceneSize,
    policy: activeLesson.policy,
    onProgramChange,
  });

  const measurementEvaluation = useMemo(
    () => evaluateMeasurements(construction.program, construction.evaluated),
    [construction.program, construction.evaluated],
  );

  const scene = useMemo(
    () =>
      sceneForEvaluation(
        construction.evaluated,
        {
          viewport: defaultView.viewport,
          camera: camera.camera,
        },
        {
          fontSize: 18 * sizeScale,
          isTransitioning: camera.isTransitioning,
          measurementEvaluation,
        },
      ),
    [
      construction.evaluated,
      defaultView.viewport,
      camera.camera,
      sizeScale,
      camera.isTransitioning,
      measurementEvaluation,
    ],
  );

  const goalResults = useMemo(() => {
    if (activeLesson.goals.length === 0) {
      return [];
    }

    const context = {
      program: construction.program,
      evaluation: construction.evaluated,
      starterProgram: activeLesson.document.program,
    };
    const mapping = resolveGoalMapping(
      construction.evaluated,
      activeLesson.goals,
      activeLesson.document.program,
    );
    return activeLesson.goals.map((goal) => {
      const mappedGoal = mapGoalIds(goal, mapping);
      const result = evaluateGoal(context, mappedGoal);
      return {
        goal,
        passed: result.passed,
        message: result.message,
      };
    });
  }, [construction.program, construction.evaluated, activeLesson.goals, activeLesson.document.program]);

  const allGoalsPassed = useMemo(() => {
    return goalResults.length > 0 && goalResults.every((r) => r.passed);
  }, [goalResults]);

  return (
    <>
      <aside className="tool-panel" aria-label="Construction tools">
        <div className="brand">
          <Waypoints size={24} aria-hidden />
          <div>
            <h1>Euclid</h1>
            <p>Denotational construction studio</p>
          </div>
        </div>

        <div className="lesson-selector-container">
          <label htmlFor="lesson-select" className="toolbar-label">
            Curriculum Activity
          </label>
          <div className="lesson-select-row">
            <select
              id="lesson-select"
              className="lesson-select"
              value={activeLessonIndex}
              onChange={(e) => setActiveLessonIndex(Number(e.target.value))}
            >
              {lessons.map((lesson, idx) => (
                <option key={idx} value={idx}>
                  {lesson.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="reset-lesson-button"
              onClick={onResetLesson}
              title="Reset current activity to its original starter state"
            >
              Reset
            </button>
          </div>
          <div className="lesson-action-row" style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              type="file"
              id="custom-lesson-file"
              style={{ display: "none" }}
              accept=".json"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              className="reset-lesson-button"
              style={{ flex: 1, textAlign: "center" }}
              onClick={() => document.getElementById("custom-lesson-file")?.click()}
              title="Load a custom lesson JSON file"
            >
              Load Lesson
            </button>
            <button
              type="button"
              className="reset-lesson-button author-button"
              style={{
                flex: 1,
                textAlign: "center",
                background: "#1b2c28",
                color: "#34d399",
                borderColor: "#065f46",
              }}
              onClick={() => setIsAuthoringOpen(!isAuthoringOpen)}
              title="Toggle Lesson Authoring tool"
            >
              {isAuthoringOpen ? "Close Author" : "Author Lesson"}
            </button>
          </div>
          {activeLesson.description && <p className="lesson-description">{activeLesson.description}</p>}
        </div>

        {isAuthoringOpen && (
          <AuthoringPanel
            program={construction.program}
            selectedIds={construction.selectedIds}
            onClose={() => setIsAuthoringOpen(false)}
          />
        )}

        <div className="toolbar">
          <div className="toolbar-section">
            <h2 className="toolbar-label">Modes</h2>
            <nav className="toolbar-buttons" aria-label="Drawing Modes">
              {constructionToolDescriptors.map((tool) => {
                const Icon = toolbarIcons[tool.icon];
                const iconStyle = tool.icon === "parallel" ? { transform: "rotate(45deg)" } : undefined;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`tool-button ${construction.activeTool === tool.id ? "active" : ""}`}
                    title={tool.label}
                    onClick={() => construction.setTool(tool.id)}
                    disabled={!activeLesson.policy.allowedTools.includes(tool.id)}
                  >
                    <Icon size={16} aria-hidden style={iconStyle} />
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="toolbar-section">
            <h2 className="toolbar-label">Edit</h2>
            <div className="toolbar-buttons" aria-label="Edit Actions">
              <button
                type="button"
                className="tool-button"
                onClick={construction.handleUndo}
                disabled={!construction.canUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={construction.handleRedo}
                disabled={!construction.canRedo}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={construction.handleDeleteSelected}
                disabled={!construction.canDeleteSelected}
                title="Delete Selected (Delete/Backspace)"
                aria-label="Delete selected objects"
              >
                <Trash2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button build-circle-button"
                onClick={construction.handleBuildCircle}
                disabled={
                  !construction.canBuildCircle || !activeLesson.policy.allowedTools.includes("circle")
                }
                title="Build Circle (Select 2 or 3 points)"
                aria-label="Build Circle"
              >
                <Circle size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button toggle-drawer-button ${isDrawerExpanded ? "active" : ""}`}
                onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                title="Settings & Objects"
                aria-label="Settings & Objects"
              >
                <Sliders size={16} aria-hidden />
              </button>
            </div>
          </div>

          {goalResults.length > 0 && (
            <div className="toolbar-section lesson-goals-section">
              <h2 className="toolbar-label">Objectives</h2>
              <div className="goals-list">
                {goalResults.map(({ goal, passed, message }, index) => (
                  <div key={index} className={`goal-item ${passed ? "passed" : ""}`}>
                    <span className="goal-status">{passed ? "✓" : "○"}</span>
                    <span className="goal-text">{goal.description ?? message}</span>
                  </div>
                ))}
              </div>
              {allGoalsPassed && <div className="lesson-success-banner">🎉 Activity Completed!</div>}
            </div>
          )}
        </div>

        <ViewControls camera={camera} sizeScale={sizeScale} onChangeSizeScale={setSizeScale} />
        <MeasurementPanel
          program={construction.program}
          selectedIds={construction.selectedIds}
          realizedPointIds={
            new Set(
              construction.evaluated.primitives
                .filter((primitive) => primitive.kind === "point")
                .map((primitive) => primitive.id),
            )
          }
          measurementEvaluation={measurementEvaluation}
          expressionDraft={measurementExpressionDraft}
          onChangeExpressionDraft={setMeasurementExpressionDraft}
          intentDraft={measurementIntentDraft}
          onChangeIntentDraft={setMeasurementIntentDraft}
          variableDraft={measurementVariableDraft}
          onChangeVariableDraft={setMeasurementVariableDraft}
          variableValueDraft={measurementVariableValueDraft}
          onChangeVariableValueDraft={setMeasurementVariableValueDraft}
          onSetUnitLength={construction.handleSetMeasurementUnitLength}
          onSetVariableValue={construction.handleSetMeasurementVariableValue}
          onUpsertSegmentMeasurement={construction.handleUpsertSegmentMeasurement}
          onRemoveSegmentMeasurement={construction.handleRemoveSegmentMeasurement}
          onApplyMeasurementConstraint={construction.handleApplyMeasurementConstraint}
          measurementActionMessages={construction.measurementActionMessages}
        />
        <ObjectList
          constructions={construction.program.constructions}
          selectedIds={construction.selectedIds}
          onSelect={construction.handleSelect}
        />
        <SelectionDetails
          selectedIds={construction.selectedIds}
          constructions={construction.program.constructions}
          onDelete={construction.handleDeleteSelected}
          canDelete={construction.canDeleteSelected}
          onSetShapeRole={construction.handleSetShapeRole}
          onSetFreePointMobility={construction.handleSetFreePointMobility}
        />
      </aside>

      <WorkspaceView
        scene={scene}
        selectedIds={construction.selectedIds}
        onSelect={construction.handleSelect}
        onPanBy={camera.moveSceneBy}
        onZoom={camera.setZoom}
        currentZoom={camera.zoom}
        activeTool={construction.activeTool}
        onAddPoint={construction.handleAddPoint}
        onBeginPointDrag={construction.handleBeginPointDrag}
        onMovePoint={construction.handleMovePoint}
        onEndPointDrag={construction.handleEndPointDrag}
        onBeginShapeDrag={construction.handleBeginShapeDrag}
        onMoveShape={construction.handleMoveShape}
        onAddIntersection={construction.handleAddIntersection}
        canDragPoint={construction.canDragPoint}
        sizeScale={sizeScale}
        constructions={construction.program.constructions}
        onDeleteSelected={construction.handleDeleteSelected}
        draftPreview={construction.draftPreview}
      />
    </>
  );
}

function MeasurementPanel({
  program,
  selectedIds,
  realizedPointIds,
  measurementEvaluation,
  expressionDraft,
  onChangeExpressionDraft,
  intentDraft,
  onChangeIntentDraft,
  variableDraft,
  onChangeVariableDraft,
  variableValueDraft,
  onChangeVariableValueDraft,
  onSetUnitLength,
  onSetVariableValue,
  onUpsertSegmentMeasurement,
  onRemoveSegmentMeasurement,
  onApplyMeasurementConstraint,
  measurementActionMessages,
}: {
  program: ConstructionProgram;
  selectedIds: ReadonlySet<ConstructionId>;
  realizedPointIds: ReadonlySet<ConstructionId>;
  measurementEvaluation: MeasurementEvaluation;
  expressionDraft: string;
  onChangeExpressionDraft: (value: string) => void;
  intentDraft: MeasurementIntent;
  onChangeIntentDraft: (value: MeasurementIntent) => void;
  variableDraft: string;
  onChangeVariableDraft: (value: string) => void;
  variableValueDraft: string;
  onChangeVariableValueDraft: (value: string) => void;
  onSetUnitLength: (unitLength: number | undefined) => void;
  onSetVariableValue: (variable: string, value: number | undefined) => void;
  onUpsertSegmentMeasurement: (
    points: readonly [ConstructionId, ConstructionId],
    length: number | string,
    intent: MeasurementIntent,
  ) => void;
  onRemoveSegmentMeasurement: (id: string) => void;
  onApplyMeasurementConstraint: (id: string, behavior: MeasurementConstraintBehavior) => void;
  measurementActionMessages: Readonly<Record<string, string>>;
}) {
  const selectedPointIds = Array.from(selectedIds).filter((id) => realizedPointIds.has(id));
  const canAttachMeasurement = selectedPointIds.length === 2 && expressionDraft.trim().length > 0;
  const currentUnitLength = program.measurementSettings?.unitLength ?? 1;

  const handleSetUnit = (value: string) => {
    const parsed = Number(value);
    onSetUnitLength(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
  };

  const handleSetVariable = () => {
    const parsed = Number(variableValueDraft);
    onSetVariableValue(variableDraft, Number.isFinite(parsed) ? parsed : undefined);
  };

  const handleAttachMeasurement = () => {
    if (!canAttachMeasurement) {
      return;
    }
    onUpsertSegmentMeasurement(
      selectedPointIds as [ConstructionId, ConstructionId],
      expressionDraft.trim(),
      intentDraft,
    );
  };

  return (
    <section className="measurement-panel" aria-label="Measurements">
      <h2>Measurements</h2>
      <label className="measurement-field">
        <span>Unit scale</span>
        <input
          key={currentUnitLength}
          type="number"
          min="0.0001"
          step="0.1"
          defaultValue={currentUnitLength}
          onBlur={(event) => handleSetUnit(event.currentTarget.value)}
        />
      </label>
      <div className="measurement-row">
        <label className="measurement-field variable-name-field">
          <span>Symbol</span>
          <input value={variableDraft} onChange={(event) => onChangeVariableDraft(event.target.value)} />
        </label>
        <label className="measurement-field variable-value-field">
          <span>Value in units</span>
          <input
            type="number"
            step="0.1"
            value={variableValueDraft}
            onChange={(event) => onChangeVariableValueDraft(event.target.value)}
          />
        </label>
        <button type="button" className="measurement-action" onClick={handleSetVariable}>
          Set
        </button>
      </div>
      <div className="measurement-row">
        <label className="measurement-field measurement-expression-field">
          <span>Expression</span>
          <input value={expressionDraft} onChange={(event) => onChangeExpressionDraft(event.target.value)} />
        </label>
        <label className="measurement-field measurement-intent-field">
          <span>Intent</span>
          <select
            value={intentDraft}
            onChange={(event) => onChangeIntentDraft(event.target.value as MeasurementIntent)}
          >
            <option value="check">Check only</option>
            <option value="constraint">Constraint</option>
          </select>
        </label>
        <button
          type="button"
          className="measurement-action"
          onClick={handleAttachMeasurement}
          disabled={!canAttachMeasurement}
        >
          Add
        </button>
      </div>
      <MeasurementList
        measurements={program.measurements ?? []}
        measurementEvaluation={measurementEvaluation}
        onRemoveSegmentMeasurement={onRemoveSegmentMeasurement}
        onApplyMeasurementConstraint={onApplyMeasurementConstraint}
        measurementActionMessages={measurementActionMessages}
      />
    </section>
  );
}

function MeasurementList({
  measurements,
  measurementEvaluation,
  onRemoveSegmentMeasurement,
  onApplyMeasurementConstraint,
  measurementActionMessages,
}: {
  measurements: readonly SegmentLengthMeasurement[];
  measurementEvaluation: MeasurementEvaluation;
  onRemoveSegmentMeasurement: (id: string) => void;
  onApplyMeasurementConstraint: (id: string, behavior: MeasurementConstraintBehavior) => void;
  measurementActionMessages: Readonly<Record<string, string>>;
}) {
  if (measurements.length === 0) {
    return <p className="measurement-empty">No measurements</p>;
  }

  const evaluatedById = new Map(
    measurementEvaluation.segments.map((segment) => [segment.measurement.id, segment]),
  );

  return (
    <ol className="measurement-list">
      {measurements.map((measurement) => {
        const evaluated = evaluatedById.get(measurement.id);
        const actionMessage = measurementActionMessages[measurement.id];
        return (
          <li key={measurement.id} className={`measurement-item ${evaluated?.status ?? "unresolved"}`}>
            <span>
              {measurement.label ?? `${measurement.from}${measurement.to}`} = {measurement.length}
              <small>{measurement.intent ?? "check"}</small>
            </span>
            <code>
              {evaluated ? `${formatMeasurementValue(evaluated.actualUnitLength)} units` : "unrealized"}
            </code>
            <button
              type="button"
              className="measurement-remove"
              onClick={() => onRemoveSegmentMeasurement(measurement.id)}
              aria-label={`Remove ${measurement.label ?? measurement.id}`}
            >
              x
            </button>
            {(measurement.intent ?? "check") === "constraint" && (
              <div className="measurement-apply-actions">
                <button
                  type="button"
                  onClick={() => onApplyMeasurementConstraint(measurement.id, "calibrate-unit")}
                >
                  Calibrate unit
                </button>
                <button
                  type="button"
                  onClick={() => onApplyMeasurementConstraint(measurement.id, "move-free-endpoint")}
                >
                  Solve endpoint
                </button>
              </div>
            )}
            {evaluated?.diagnostic && (
              <p className="measurement-diagnostic">{evaluated.diagnostic.message}</p>
            )}
            {actionMessage && <p className="measurement-action-message">{actionMessage}</p>}
          </li>
        );
      })}
    </ol>
  );
}
