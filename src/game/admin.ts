export interface AdminPlayer {
  uid: string;
  email: string;
  name: string;
  level: number;
  faction: string | null;
  gold: number;
  bankGold: number;
  ap: number;
  renown: number;
  enlisted: boolean;
  suspended: boolean;
  revision: number;
}
export interface AdminSummary {
  realms: number;
  enlisted: number;
  suspended: number;
  campaign: { name: string; scores: Record<string, number> } | null;
  audit: {
    id: string;
    actor: string;
    target: string;
    action: string;
    reason: string;
    at: number;
  }[];
}
