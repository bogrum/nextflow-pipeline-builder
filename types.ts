export interface PipelineParameter {
  id: string;
  name: string;
  defaultValue: string;
  description: string;
  type: 'string' | 'integer' | 'boolean' | 'path' | 'file' | 'directory';
}

export interface NextflowProcess {
  id: string;
  name: string;
  description: string;
  inputDeclarations: string;  // Multiline string
  outputDeclarations: string; // Multiline string
  directiveDeclarations: string; // Multiline string
  script: string;
}

export interface Pipeline {
  name: string;
  description: string;
  version: string;
  parameters: PipelineParameter[];
  processes: NextflowProcess[];
  workflowContent: string;
  nextflowConfigContent: string;
}

export enum Tab {
  SETUP = "Setup",
  PARAMETERS = "Parameters",
  PROCESSES = "Processes",
  WORKFLOW = "Workflow",
  VISUALIZER = "Visualizer",
  CONFIG = "Config",
  PREVIEW = "Preview"
}

export interface ProcessTemplate extends Omit<NextflowProcess, 'id' | 'name'> {
  templateName: string; // Name for selection in UI
  templateDescription: string; // Description for selection in UI
  processNameSuggestion: string; // Suggested process name
}

// For AI Full Pipeline Suggestion
export interface AIPipelineParameterSuggestion extends Omit<PipelineParameter, 'id'> {}

export interface AINextflowProcessSuggestion extends Omit<NextflowProcess, 'id'> {}

export interface AIPipelineSuggestion {
  pipelineName: string;
  pipelineDescription: string;
  pipelineVersion?: string; // Optional, AI might suggest or we default
  parameters: AIPipelineParameterSuggestion[];
  processes: AINextflowProcessSuggestion[];
  workflowContent: string;
}