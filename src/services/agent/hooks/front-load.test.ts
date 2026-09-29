import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setCapabilitySelection } from '../capabilities';
import { discoverSkills, frontLoadMessages, getSkillsDirs, listSkills, loadSkillContent } from './front-load';

const tempRoot = join(import.meta.dir, '__fixtures__', 'skills-front-load');

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('frontLoadMessages skills', () => {
  test('front-loads skill catalog without full skill bodies', async () => {
    const skillsDir = join(tempRoot, 'skills', 'demo-skill');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(
      join(skillsDir, 'SKILL.md'),
      [
        '---',
        'name: demo-skill',
        'description: Use for demo tasks.',
        '---',
        '# Demo Skill',
        'Follow these detailed steps.',
      ].join('\n'),
    );

    const messages = await frontLoadMessages(tempRoot, { skillsDirs: [join(tempRoot, 'skills')] });
    const catalog = messages.find(
      (message) => message.role === 'system' && String(message.content).includes('<available_skills>'),
    );

    expect(catalog).toBeDefined();
    expect(String(catalog?.content)).toContain('Use for demo tasks.');
    expect(String(catalog?.content)).not.toContain('Follow these detailed steps.');

    const content = await loadSkillContent('demo-skill');
    expect(content).toContain('Follow these detailed steps.');
  });

  test('getSkillsDirs includes the workspace skills directory first', () => {
    expect(getSkillsDirs(tempRoot)[0]).toBe(join(tempRoot, 'skills'));
  });

  test('frontLoadMessages discovers workspace skills without a custom skillsDirs override', async () => {
    const skillsDir = join(tempRoot, 'skills', 'workspace-skill');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(
      join(skillsDir, 'SKILL.md'),
      '---\nname: workspace-skill\ndescription: Workspace-local skill.\n---\nBody',
    );

    const messages = await frontLoadMessages(tempRoot, { skillsDirs: getSkillsDirs(tempRoot) });
    const catalog = messages.map((message) => String(message.content)).join('\n');

    expect(catalog).toContain('Workspace-local skill.');
    expect(await loadSkillContent('workspace-skill')).toContain('Body');
  });

  test('discovers skills from a custom directory', async () => {
    const skillsDir = join(tempRoot, 'custom', 'lint-helper');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(
      join(skillsDir, 'SKILL.md'),
      '# Lint Helper\nRun lint before committing.',
    );

    const skills = await discoverSkills([join(tempRoot, 'custom')]);
    expect(skills).toEqual([{
      name: 'lint-helper',
      description: 'Run lint before committing.',
      path: join(skillsDir, 'SKILL.md'),
    }]);
  });

  test('only front-loads enabled skills', async () => {
    for (const name of ['kept-skill', 'dropped-skill']) {
      const dir = join(tempRoot, 'skills', name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} description\n---\nBody`);
    }

    setCapabilitySelection({ skills: ['kept-skill'], mcpServers: [], userTools: [] });
    const messages = await frontLoadMessages(tempRoot, { skillsDirs: [join(tempRoot, 'skills')] });
    const catalog = messages.map((message) => String(message.content)).join('\n');

    expect(catalog).toContain('kept-skill description');
    expect(catalog).not.toContain('dropped-skill description');
    expect(listSkills().map((skill) => skill.name)).toEqual(['kept-skill']);
    expect(await loadSkillContent('dropped-skill')).toBeNull();
  });
});
