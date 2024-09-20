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
    const baseNodes = [
      { id: 'promptTemplate', label: 'Prompt Template' },
      { id: 'llm', label: 'LLM' },
      { id: 'outputParser', label: 'Output Parser' },
    ];
    const baseEdges = [
      { from: 'promptTemplate', to: 'llm' },
      { from: 'llm', to: 'outputParser' },
    ];

    // Generate nodes and edges from executionLogs
    const executionNodes = executionLogs.map((log, index) => ({
      id: `execution-${index}`,
      label: `User: ${log.input}\nLLM: ${log.output}`,
    }));

    const executionEdges = executionLogs.map((_, index) => ({
      from: 'llm',
      to: `execution-${index}`,
    }));

    res.status(200).json({ nodes: [...baseNodes, ...executionNodes], edges: [...baseEdges, ...executionEdges] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve LLM visualization data.' });
  }
};
