export const parseStreamChunk = (line: string) => {
  if (line.startsWith('data: ') && line !== 'data: [DONE]') {
    try {
      return JSON.parse(line.slice(6));
    } catch (e) {
      console.warn("Failed to parse JSON chunk", line, e);
    }
  }
  return null;
};

export const extractThinkContent = (rawContentStream: string, nativeReasoningStream: string) => {
  let currentContent = rawContentStream;
  let currentReasoning = nativeReasoningStream;

  if (currentContent.includes('<think>')) {
    const parts = currentContent.split('<think>');
    currentContent = parts[0];
    
    const afterThink = parts[1];
    if (afterThink.includes('</think>')) {
      const innerParts = afterThink.split('</think>');
      if (innerParts[0]) currentReasoning += (currentReasoning ? '\n' : '') + innerParts[0];
      currentContent += innerParts[1];
    } else {
      if (afterThink) currentReasoning += (currentReasoning ? '\n' : '') + afterThink;
    }
  }

  return { content: currentContent, reasoning: currentReasoning };
};
