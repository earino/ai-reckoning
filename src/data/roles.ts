import type { Role } from "./types";

export const ROLE_ORDER: Role[] = ["capital", "models_apps", "infrastructure", "compute", "energy", "control_tech", "control_other", "other"];
export const ROLE_LABEL: Record<Role, string> = {
  capital: "Capital & financing", models_apps: "Models & applications", infrastructure: "Clouds & data centres", compute: "Chips & hardware",
  energy: "Power & physical plant", control_tech: "Controls: other tech", control_other: "Controls: non-tech", other: "Other",
};
export const ROLE_SHORT: Record<Role, string> = {
  capital: "Capital", models_apps: "Models & apps", infrastructure: "Clouds", compute: "Chips", energy: "Power", control_tech: "Tech controls",
  control_other: "Non-tech controls", other: "Other",
};
/** Colour is always paired with a shape so that role never depends on colour alone. */
export const ROLE_COLOR: Record<Role, string> = {
  capital: "#e58fa5", models_apps: "#b58ae6", infrastructure: "#58a6d8", compute: "#e3a33b", energy: "#6fbf8e", control_tech: "#8a8f98",
  control_other: "#6b7079", other: "#8a8f98",
};
export const ROLE_SHAPE: Record<Role, string> = {
  capital: "diamond", models_apps: "triangle", infrastructure: "square", compute: "circle", energy: "hexagon", control_tech: "ring", control_other: "ring", other: "ring",
};
export const DECLINE = "#ff5a3c";
export const GAIN = "#34d0ba";
export const NEUTRAL = "#8a8f98";
export const AI_ROLES: Role[] = ["capital", "models_apps", "infrastructure", "compute", "energy"];

export const EDGE_TYPE_LABEL: Record<string, string> = {
  equity_investment: "Equity investment", debt_financing: "Debt financing", ownership_revenue_share: "Ownership / revenue share",
  compute_purchase: "Compute purchase", hardware_purchase: "Hardware purchase", cloud_service: "Cloud service", capacity_commitment: "Capacity commitment",
  power_procurement: "Power procurement",
};
export const EDGE_FAMILY: Record<string, "capital" | "purchase" | "power"> = {
  equity_investment: "capital", debt_financing: "capital", ownership_revenue_share: "capital", compute_purchase: "purchase", hardware_purchase: "purchase",
  cloud_service: "purchase", capacity_commitment: "purchase", power_procurement: "power",
};
export const FAMILY_COLOR = { capital: "#e58fa5", purchase: "#9cc7e6", power: "#6fbf8e" } as const;
export const FAMILY_LABEL = { capital: "Capital (equity, debt)", purchase: "Purchases (compute, chips, capacity)", power: "Power" } as const;
export const STATUS_LABEL: Record<string, string> = {
  completed: "Completed — money has moved", ongoing: "Ongoing — binding contract in progress", announced: "Announced — not yet started",
  conditional: "Conditional — letter of intent, option or ceiling", estimated: "Estimated — amount from media reports",
};
