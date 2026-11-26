import type { Role } from "./auth";

// Destination only; patient access and administrator rights remain database-enforced.
export function signedInDestination(roles: Role[]) {
  return roles.includes("medical_professional") ? "/professional" : "/dashboard";
}