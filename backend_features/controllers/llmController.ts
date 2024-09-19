import { Request, Response } from 'express';
import { executionLogs, chain } from '../../app.js'; // Assuming executionLogs is exported from app.ts

/**
 * Retrieve LLM chain execution data.
 */
export const getLLMMonitoring = (req: Request, res: Response) => {
  try {
    res.status(200).json({ executions: executionLogs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve LLM monitoring data.' });
  }
};

/**
 * Retrieve LLM chain structure data for graph visualization.
 */
export const getLLMVisualization = (req: Request, res: Response) => {
  try {
    // Example structure; adjust based on actual chain implementation
    const nodes = [
      { id: 'promptTemplate', label: 'Prompt Template' },
      { id: 'llm', label: 'LLM' },
      { id: 'outputParser', label: 'Output Parser' },
    ];

    const edges = [
      { from: 'promptTemplate', to: 'llm' },
      { from: 'llm', to: 'outputParser' },
    ];

    res.status(200).json({ nodes, edges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve LLM visualization data.' });
  }
};
