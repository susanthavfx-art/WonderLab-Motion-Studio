import { RunnerGame } from "../runner-game.js";
import { createRunner } from "../runner.js";
export const runnerTemplate = Object.freeze({
  id: "runner",
  version: 1,
  name: "Wonder Run",
  description: "Three-lane runner with run-in-place and auto-run modes.",
  actions: ["lean", "jump", "squat", "intensity"],
  assetSlots: [
    { id: "logo", type: "image", label: "Company logo" },
    { id: "background", type: "image", label: "Backdrop" },
    { id: "character", type: "model", label: "GLB character" },
  ],
  create(host) {
    const game = new RunnerGame();
    game.reset({ difficulty: "normal" });
    const renderer = createRunner(host);
    return {
      game,
      renderer,
      start: () => game.start(),
      pause: (reason) => game.pause(reason),
      reset: (settings) => game.reset(settings),
      update: (dt, actions) => game.update(dt, actions),
      render: () => renderer.draw(game),
      getResults: () => ({
        score: game.score,
        distance: game.distance,
        coins: game.coins,
      }),
      dispose: () => renderer.dispose?.(),
    };
  },
});
const registry = new Map([[runnerTemplate.id, runnerTemplate]]);
export const listTemplates = () => [...registry.values()];
export function getTemplate(id) {
  const t = registry.get(id);
  if (!t) throw Error(`Unsupported template: ${id}`);
  return t;
}
export const createTemplate = (id, host) => getTemplate(id).create(host);
