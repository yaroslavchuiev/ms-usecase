import "server-only";

// PLACEHOLDER identity source. In production users come from Google SSO and their groups
// from Google Groups (see README); only this file and the login route would change.
//
// Group naming: "<role>-<location slug>", e.g. "reception-warsaw" grants the Reception
// dashboard for Warsaw. A group is the only thing that ever grants access.

export interface MockUser {
  id: string;
  name: string;
  email: string;
  groups: string[];
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "u-reception-warsaw",
    name: "Reception – Warsaw",
    email: "reception.warsaw@mindspace.example",
    groups: ["reception-warsaw"],
  },
  {
    id: "u-manager",
    name: "Manager – multi-location",
    email: "manager@mindspace.example",
    groups: ["stats-warsaw", "stats-krakow", "reception-warsaw"],
  },
  {
    id: "u-analyst-tel-aviv",
    name: "Analyst – Tel Aviv",
    email: "analyst.telaviv@mindspace.example",
    groups: ["stats-tel-aviv"],
  },
];

export function findUser(id: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}
