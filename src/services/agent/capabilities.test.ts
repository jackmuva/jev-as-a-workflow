import { describe, expect, test } from 'bun:test';
import { emptyCapabilitySelection, mergeCapabilitySelection } from './capabilities';

describe('mergeCapabilitySelection', () => {
  test('merges capabilities additively', () => {
    const current = {
      skills: ['demo-skill'],
      mcpServers: ['github'],
      userTools: [],
      agentsMd: [],
    };
    const required = {
      skills: ['other-skill'],
      mcpServers: ['github', 'slack'],
      userTools: ['deploy'],
      agentsMd: ['AGENTS.md'],
    };

    expect(mergeCapabilitySelection(current, required)).toEqual({
      skills: ['demo-skill', 'other-skill'],
      mcpServers: ['github', 'slack'],
      userTools: ['deploy'],
      agentsMd: ['AGENTS.md'],
    });
  });

  test('treats null current selection as empty', () => {
    const required = emptyCapabilitySelection();
    required.mcpServers = ['github'];

    expect(mergeCapabilitySelection(null, required)).toEqual({
      skills: [],
      mcpServers: ['github'],
      userTools: [],
      agentsMd: [],
    });
  });

  test('deduplicates overlapping entries', () => {
    const selection = {
      skills: ['demo-skill'],
      mcpServers: ['github'],
      userTools: ['deploy'],
      agentsMd: ['AGENTS.md'],
    };

    expect(mergeCapabilitySelection(selection, selection)).toEqual(selection);
  });
});
