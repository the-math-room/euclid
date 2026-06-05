import { Circle, MousePointer2, Ruler, Waypoints } from "lucide-react";
import { seedDocument } from "@euclid/document";
import { evaluateConstruction } from "@euclid/geometry";
import { sceneForEvaluation } from "@euclid/rendering";
import { WorkspaceView } from "./WorkspaceView";

const document = seedDocument;
const evaluated = evaluateConstruction(document.program);
const scene = sceneForEvaluation(evaluated, { width: 920, height: 620 });

export function App() {
  return (
    <main className="app-shell">
      <aside className="tool-panel" aria-label="Construction tools">
        <div className="brand">
          <Waypoints size={24} aria-hidden />
          <div>
            <h1>Euclid</h1>
            <p>Denotational construction studio</p>
          </div>
        </div>

        <nav className="tool-grid" aria-label="Tools">
          <button type="button" className="tool-button active" title="Select">
            <MousePointer2 size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Point">
            <Waypoints size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Line">
            <Ruler size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Circle">
            <Circle size={19} aria-hidden />
          </button>
        </nav>

        <section className="inspector" aria-label="Construction objects">
          <h2>Objects</h2>
          <ol>
            {document.program.constructions.map((construction) => (
              <li key={construction.id}>
                <span>{construction.label}</span>
                <code>{construction.kind}</code>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      <WorkspaceView scene={scene} />
    </main>
  );
}
