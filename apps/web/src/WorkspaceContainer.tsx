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
} from "lucide-react";
import { evaluateConstruction } from "@euclid/geometry";
import type { ConstructionProgram } from "@euclid/geometry";
import { evaluateGoal, mapGoalIds, resolveGoalMapping } from "@euclid/assessment";
import { defaultScreenViewFor, sceneForEvaluation } from "@euclid/rendering";
import { useMemo } from "react";
import { useConstructionController } from "./construction/useConstructionController";
import { ObjectList } from "./objects/ObjectList";
import { SelectionDetails } from "./objects/SelectionDetails";
import { useCameraController } from "./view/useCameraController";
import { ViewControls } from "./view/ViewControls";
import { WorkspaceView } from "./WorkspaceView";
import { lessons } from "./lessons/lessons";

const sceneSize = { width: 920, height: 620 };

export type WorkspaceContainerProps = Readonly<{
  activeLesson: (typeof lessons)[number];
  activeLessonIndex: number;
  setActiveLessonIndex: (index: number) => void;
  activeProgram: ConstructionProgram;
  onProgramChange: (program: ConstructionProgram) => void;
  onResetLesson: () => void;
  sizeScale: number;
  setSizeScale: (s: number | ((prev: number) => number)) => void;
  isDrawerExpanded: boolean;
  setIsDrawerExpanded: (b: boolean) => void;
}>;

export function WorkspaceContainer({
  activeLesson,
  activeLessonIndex,
  setActiveLessonIndex,
  activeProgram,
  onProgramChange,
  onResetLesson,
  sizeScale,
  setSizeScale,
  isDrawerExpanded,
  setIsDrawerExpanded,
}: WorkspaceContainerProps) {
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
        },
      ),
    [construction.evaluated, defaultView.viewport, camera.camera, sizeScale, camera.isTransitioning],
  );

  const goalResults = useMemo(() => {
    if (activeLesson.goals.length === 0) {
      return [];
    }

    const context = {
      program: construction.program,
      evaluation: construction.evaluated,
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
          {activeLesson.description && <p className="lesson-description">{activeLesson.description}</p>}
        </div>

        <div className="toolbar">
          <div className="toolbar-section">
            <h2 className="toolbar-label">Modes</h2>
            <nav className="toolbar-buttons" aria-label="Drawing Modes">
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "select" ? "active" : ""}`}
                title="Select"
                onClick={() => construction.setTool("select")}
                disabled={!activeLesson.policy.allowedTools.includes("select")}
              >
                <MousePointer2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "point" ? "active" : ""}`}
                title="Point"
                onClick={() => construction.setTool("point")}
                disabled={!activeLesson.policy.allowedTools.includes("point")}
              >
                <Waypoints size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "line" ? "active" : ""}`}
                title="Line"
                onClick={() => construction.setTool("line")}
                disabled={!activeLesson.policy.allowedTools.includes("line")}
              >
                <Ruler size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "circle" ? "active" : ""}`}
                title="Circle"
                onClick={() => construction.setTool("circle")}
                disabled={!activeLesson.policy.allowedTools.includes("circle")}
              >
                <Circle size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "parallel" ? "active" : ""}`}
                title="Parallel Line"
                onClick={() => construction.setTool("parallel")}
                disabled={!activeLesson.policy.allowedTools.includes("parallel")}
              >
                <Equal size={16} aria-hidden style={{ transform: "rotate(45deg)" }} />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "perpendicular" ? "active" : ""}`}
                title="Perpendicular Line"
                onClick={() => construction.setTool("perpendicular")}
                disabled={!activeLesson.policy.allowedTools.includes("perpendicular")}
              >
                <BetweenHorizonalEnd size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "midpoint" ? "active" : ""}`}
                title="Midpoint"
                onClick={() => construction.setTool("midpoint")}
                disabled={!activeLesson.policy.allowedTools.includes("midpoint")}
              >
                <Milestone size={16} aria-hidden />
              </button>
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
