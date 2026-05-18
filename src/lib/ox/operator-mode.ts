/** Operator experience modes — presentation layer only; does not change engines or persistence. */
export type OperatorMode =
  | "monitor"
  | "author"
  | "simulate"
  | "govern"
  | "diagnose";

export const OPERATOR_MODE_LABEL_KEYS: Record<OperatorMode, string> = {
  monitor: "modes.monitor",
  author: "modes.author",
  simulate: "modes.simulate",
  govern: "modes.govern",
  diagnose: "modes.diagnose",
};

export const OPERATOR_MODE_DESCRIPTION_KEYS: Record<OperatorMode, string> = {
  monitor: "modes.monitorDesc",
  author: "modes.authorDesc",
  simulate: "modes.simulateDesc",
  govern: "modes.governDesc",
  diagnose: "modes.diagnoseDesc",
};
