import type { CapabilityCatalog, CapabilityKind, CapabilitySelection, JevMessage } from "../../models/agent";
import { frontLoadMessages } from "./hooks/front-load";
import { jevMessage } from "./utils/jev-message";

let selection: CapabilitySelection | null = null;

export const getCapabilitySelection = () => selection;

export const setCapabilitySelection = (next: CapabilitySelection) => {
  selection = next;
};

export const isCapabilityEnabled = (kind: CapabilityKind, name: string) =>
  selection !== null && selection[kind].includes(name);

export const emptyCapabilitySelection = (): CapabilitySelection => ({
  skills: [],
  mcpServers: [],
  userTools: [],
  agentsMd: [],
});

const union = (left: string[], right: string[]) => [...new Set([...left, ...right])];

export const mergeCapabilitySelection = (
  current: CapabilitySelection | null,
  required: CapabilitySelection,
): CapabilitySelection => ({
  skills: union(current?.skills ?? [], required.skills),
  mcpServers: union(current?.mcpServers ?? [], required.mcpServers),
  userTools: union(current?.userTools ?? [], required.userTools),
  agentsMd: union(current?.agentsMd ?? [], required.agentsMd),
});

export const applyCapabilitySelection = async (
  next: CapabilitySelection,
): Promise<JevMessage[]> => {
  setCapabilitySelection(next);
  return (await frontLoadMessages()).map((message) => jevMessage(message));
};

export const isCatalogEmpty = (catalog: CapabilityCatalog) =>
  catalog.skills.length
  + catalog.mcpServers.length
  + catalog.userTools.length
  + catalog.agentsMd.length === 0;
