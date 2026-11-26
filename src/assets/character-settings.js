export const CHARACTER_ACTIONS = ["idle", "run", "jump", "duck"];
export const defaultCharacter = () => ({
  scale: 1,
  facing: 180,
  clips: { idle: null, run: null, jump: null, duck: null },
});
export function validateCharacter(value) {
  const c = value ?? defaultCharacter();
  if (
    !c ||
    !Number.isFinite(c.scale) ||
    c.scale < 0.5 ||
    c.scale > 2 ||
    ![0, 90, 180, 270].includes(c.facing) ||
    !c.clips
  )
    throw Error("Invalid character size, facing or animation mapping.");
  for (const action of CHARACTER_ACTIONS)
    if (
      c.clips[action] !== null &&
      (!Number.isInteger(c.clips[action]) ||
        c.clips[action] < 0 ||
        c.clips[action] > 63)
    )
      throw Error("Invalid animation clip index.");
  return {
    scale: c.scale,
    facing: c.facing,
    clips: Object.fromEntries(CHARACTER_ACTIONS.map((a) => [a, c.clips[a]])),
  };
}
export function characterAction(game) {
  if (game.state === "finished") return "idle";
  if (game.height > 0.02) return "jump";
  if (game.squat) return "duck";
  return game.state === "running" && game.speed > 0.2 ? "run" : "idle";
}
