
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AIPipelineSuggestion } from "../types";

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

const API_UNAVAILABLE_ERROR = "Error: Gemini API Key not configured or failed to initialize. AI features are disabled. The API_KEY environment variable must be set during deployment to enable AI features.";

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI with the provided API_KEY:", error);
    // ai remains null, API_UNAVAILABLE_ERROR will be used by functions
  }
} else {
  // This warning is for the developer console during development/deployment
  console.warn("API_KEY environment variable not set. Gemini AI features will be disabled.");
}

export const isGeminiConfigured = (): boolean => {
  return !!ai;
};

export const suggestNextflowProcessParts = async (taskDescription: string): Promise<string> => {
  if (!ai) return API_UNAVAILABLE_ERROR;

  const prompt = `You are an expert assistant for Nextflow pipeline development.
A user is creating a Nextflow process to perform the following task: "${taskDescription}".

Please provide suggestions for the following parts of a Nextflow process, formatted clearly:
1.  **Input Declarations** (one declaration per line, e.g., \`tuple val(meta), path(reads)\` or \`params.my_param\`):
    \`\`\`nextflow_input
    // Suggested input declarations here
    \`\`\`

2.  **Output Declarations** (one declaration per line, e.g., \`tuple val(meta), path("*.bam"), emit: aligned_bams\` or \`path "output_file.txt"\`):
    \`\`\`nextflow_output
    // Suggested output declarations here
    \`\`\`
    
3.  **Directive Declarations** (one declaration per line, e.g., \`publishDir params.outdir, mode: 'copy'\` or \`tag "\${meta.id}"\`):
    \`\`\`nextflow_directive
    // Suggested directive declarations here
    \`\`\`

4.  **Script Block** (shell commands, enclosed in a \`script:\` block with triple backticks for the shell script part):
    \`\`\`nextflow_script
    script:
    """
    #!/bin/bash
    # Suggested shell script commands here
    # Use placeholders like \${task.cpus}, \${input_file_variable}, output_file_name.txt
    """
    \`\`\`

Use common Nextflow conventions and placeholders. Be specific and provide actionable examples.
If the task is unclear, provide a general template.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: {
        temperature: 0.5, 
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for process parts:", error);
    if (error instanceof Error) {
      return `Error generating process suggestion: ${error.message}`;
    }
    return "An unknown error occurred while generating process suggestion.";
  }
};

export const suggestNextflowWorkflow = async (pipelineGoal: string, processNames: string[]): Promise<string> => {
  if (!ai) return API_UNAVAILABLE_ERROR;

  const prompt = `You are an expert Nextflow pipeline development assistant.
A user wants to create a workflow for the following goal: "${pipelineGoal}".
The available processes are: ${processNames.join(', ')}. If no processes are listed, assume common bioinformatics process names if relevant to the goal.

Suggest the Nextflow workflow block content. This is the part that goes inside \`workflow { ... }\`.
Focus on logically connecting the available processes using Nextflow channel syntax.
Use placeholders like \`Channel.fromPath(params.input_files)\` for initial inputs.
Example:
PROCESS_A ( Channel.fromPath(params.reads) )
PROCESS_B ( PROCESS_A.out.some_output )
PROCESS_C ( PROCESS_A.out.another_output, PROCESS_B.out.result )

Only provide the content for the workflow block. Do not include the "workflow { ... }" wrapper itself.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: {
        temperature: 0.6, 
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for workflow suggestion:", error);
    if (error instanceof Error) {
      return `Error generating workflow suggestion: ${error.message}`;
    }
    return "An unknown error occurred while generating workflow suggestion.";
  }
};

export const suggestFullNextflowPipeline = async (pipelineGoal: string): Promise<AIPipelineSuggestion | string> => {
  if (!ai) return API_UNAVAILABLE_ERROR;

  const prompt = `You are an expert Nextflow pipeline development assistant.
A user wants to create a complete Nextflow pipeline for the following goal: "${pipelineGoal}".

Your output MUST be a single, valid JSON object. Do NOT include any markdown formatting (like \`\`\`json) or any explanatory text before or after the JSON block.

ABSOLUTELY CRITICAL - JSON STRING ESCAPING RULES:
For the entire JSON output to be valid, ALL special characters within ANY string value in the JSON MUST be correctly escaped according to standard JSON string rules. This is the most common source of errors.
Pay EXTREME attention to these rules:
1.  BACKSLASH (\\): A literal backslash character must be written as \\\\ (two backslashes) in the JSON string.
    Example: Intended text 'path\\to\\file' becomes JSON string "path\\\\to\\\\file".
2.  DOUBLE QUOTE ("): A literal double quote character must be written as \\" (backslash followed by double quote) in the JSON string.
    Example: Intended text 'say "Hello"' becomes JSON string "say \\"Hello\\"".
3.  NEWLINE (actual line break): A literal newline character must be written as \\n (backslash followed by 'n') in the JSON string.
    Example: Intended multi-line text:
    First line
    Second line
    Becomes JSON string: "First line\\nSecond line"
4.  TAB: A literal tab character must be written as \\t (backslash 't').
5.  NO UNESCAPED LITERAL NEWLINES OR UNESCAPED DOUBLE-QUOTES are allowed directly within a JSON string value. They MUST be escaped.

The JSON object should have the following top-level keys: "pipelineName", "pipelineDescription", "parameters", "processes", "workflowContent".
An optional "pipelineVersion" key can be included with a string value like "1.0.0".

Details for each key (REMEMBER TO APPLY JSON STRING ESCAPING TO ALL STRING VALUES):

1.  **pipelineName**: (string) E.g., "RNASeqAnalysis".
2.  **pipelineDescription**: (string) E.g., "Analyzes RNA-seq data.".
3.  **pipelineVersion**: (string, optional) E.g., "1.0.0".
4.  **parameters**: (array of objects) Each parameter object:
    *   "name": (string) E.g., "input_reads".
    *   "type": (string from: 'string', 'integer', 'boolean', 'path', 'file', 'directory').
    *   "defaultValue": (string) E.g., "./input" or "true".
    *   "description": (string) E.g., "Path to input FASTQ files.".
    *   Example: \`{ "name": "outdir", "type": "directory", "defaultValue": "./results", "description": "Output directory" }\`

5.  **processes**: (array of objects) Each process object:
    *   "name": (string) E.g., "FASTQC_PROCESS".
    *   "description": (string) E.g., "Runs FastQC".
    *   "inputDeclarations": (string) Example: Intended Nextflow input: \`val x\npath y\` becomes JSON string: "val x\\npath y".
    *   "outputDeclarations": (string) Example: Intended Nextflow output: \`path "*.txt"\` becomes JSON string: "path \\"*.txt\\"".
    *   "directiveDeclarations": (string) Example: Intended Nextflow directive: \`tag "my tag"\` becomes JSON string: "tag \\"my tag\\"".
    *   "script": (string) This is where escaping is MOST critical.
        Example: Intended shell script:
          \`echo "Processing \${meta.id}"
          touch \${meta.id}.txt\`
        Becomes JSON string: "echo \\"Processing \${meta.id}\\"\\ntouch \${meta.id}.txt"

6.  **workflowContent**: (string) Nextflow workflow logic.
    Example: Intended workflow:
      \`CH1 = Channel.fromPath(params.input_dir)
      MY_PROCESS( CH1 )\`
    Becomes JSON string: "CH1 = Channel.fromPath(params.input_dir)\\nMY_PROCESS( CH1 )"

SELF-CORRECTION MANDATE: Before outputting the JSON, rigorously review EVERY string value. Ensure ALL backslashes, double quotes, and newlines within those strings are correctly escaped (\\\\, \\", \\n respectively). A single mistake will break the entire JSON. The final output must be a single, minified JSON object without any newlines outside of the (escaped) string values themselves.

Based on the goal: "${pipelineGoal}"

Generate ONLY the single, valid JSON object.
`;

  let jsonStr = ''; 
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: {
        temperature: 0.7, 
        responseMimeType: "application/json", 
      }
    });

    jsonStr = response.text.trim();
    
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData: AIPipelineSuggestion = JSON.parse(jsonStr);
    
    if (!parsedData.pipelineName || !Array.isArray(parsedData.parameters) || !Array.isArray(parsedData.processes) || typeof parsedData.workflowContent === 'undefined') {
        throw new Error("AI response is not in the expected JSON format. Key top-level fields might be missing or of the wrong type.");
    }
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API for full pipeline suggestion or parsing its response:", error);
    if (error instanceof Error) {
      let effectiveResponseText = 'N/A'; 
      if (error.name === 'SyntaxError' && typeof jsonStr === 'string' && jsonStr.length > 0) {
        effectiveResponseText = `Raw Gemini Response (that failed parsing):\n${jsonStr}`;
      } else if ((error as any).cause) { 
        effectiveResponseText = `Error Cause: ${String((error as any).cause)}`;
      } else {
        effectiveResponseText = `Error details: ${error.message}`;
      }
      return `Error processing full pipeline suggestion: ${error.message}. ${effectiveResponseText}`;
    }
    return `An unknown error occurred while generating full pipeline suggestion: ${String(error)}`;
  }
};
