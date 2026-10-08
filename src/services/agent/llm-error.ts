import { APICallError } from 'ai';

const isContextLimitError = (error: APICallError): boolean => {
  const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
  if (statusCode === 413) return true;

  const message = error.message.toLowerCase();
  return (
    message.includes('context')
    || message.includes('token')
    || message.includes('too long')
    || message.includes('maximum')
    || message.includes('payload')
    || (statusCode === 400 && (
      message.includes('length')
      || message.includes('limit')
      || message.includes('request')
    ))
  );
};

export const formatAgentRunError = (error: unknown): string => {
  if (APICallError.isInstance(error)) {
    if (isContextLimitError(error)) {
      return 'The conversation or tool output exceeded the model context limit. Large tool results were trimmed automatically; try a shorter task, disable unused MCP tools, or start a new session.';
    }
    const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
    const prefix = statusCode != null ? `API error (${statusCode})` : 'API error';
    const detail = error.message.trim();
    return detail ? `${prefix}: ${detail}` : prefix;
  }

  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'The agent run failed due to an unexpected error.';
};
