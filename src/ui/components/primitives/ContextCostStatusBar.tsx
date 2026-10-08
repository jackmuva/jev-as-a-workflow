import { COMPACTION_TOKEN_THRESHOLD } from '../../../constants';
import { formatSessionCostUsd, formatSessionTokens } from '../../lib/format/session-stats';

const MUTED_FG = '#565f89';
const WARM_FG = '#e0af68';

type ContextCostStatusBarProps = {
  contextPercent: number;
  sessionTokensUsed: number;
  sessionCostUsd: number;
  terminalWidth: number;
};

const buildStatusText = (
  contextPercent: number,
  sessionTokensUsed: number,
  sessionCostUsd: number,
  terminalWidth: number,
): string => {
  const tokensLabel = formatSessionTokens(sessionTokensUsed);
  const costLabel = formatSessionCostUsd(sessionCostUsd);
  const full = `context ${contextPercent}% · ${tokensLabel} · session ${costLabel}`;
  const medium = `${contextPercent}% · ${tokensLabel} · ${costLabel}`;
  const compact = `${contextPercent}% · ${costLabel}`;

  if (terminalWidth >= 88) return full;
  if (terminalWidth >= 56) return medium;
  if (terminalWidth >= 44) return compact;
  return `${contextPercent}% · ${costLabel}`;
};

export const ContextCostStatusBar = ({
  contextPercent,
  sessionTokensUsed,
  sessionCostUsd,
  terminalWidth,
}: ContextCostStatusBarProps) => {
  const warmContext = contextPercent >= Math.round(COMPACTION_TOKEN_THRESHOLD * 100);
  const text = buildStatusText(contextPercent, sessionTokensUsed, sessionCostUsd, terminalWidth);

  return (
    <box flexDirection="row" flexShrink={0} width="100%" justifyContent="flex-end" marginTop={0}>
      <text fg={warmContext ? WARM_FG : MUTED_FG}>{text}</text>
    </box>
  );
};
