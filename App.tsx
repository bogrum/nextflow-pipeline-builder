
import React, { useState, useCallback } from 'react';
import { Pipeline, PipelineParameter, NextflowProcess, Tab, AIPipelineSuggestion, AIPipelineParameterSuggestion, AINextflowProcessSuggestion } from './types';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Textarea } from './components/ui/Textarea';
import { Card } from './components/ui/Card';
import { Modal } from './components/ui/Modal';
import { ParameterEditor } from './components/ParameterEditor';
import { ProcessEditor } from './components/ProcessEditor';
import { GeneratedCodeViewer } from './components/GeneratedCodeViewer';
import { WorkflowVisualizer } from './components/WorkflowVisualizer';
import { suggestNextflowWorkflow, suggestFullNextflowPipeline } from './services/geminiService';

const initialPipeline: Pipeline = {
  name: 'MyAwesomePipeline',
  description: 'A Nextflow pipeline built with the awesome builder.',
  version: '1.0.0',
  parameters: [],
  processes: [],
  workflowContent: `// Example: \n// READ_QC( Channel.fromPath(params.input_reads, checkIfExists: true) )\n// ALIGN_READS( READ_QC.out.passed_reads, Channel.fromPath(params.reference_genome) )\n// VARIANT_CALLING( ALIGN_READS.out.bams )`,
  nextflowConfigContent: `// Example: \n// params.max_cpus = 16\n// params.max_memory = '64.GB'`,
};

// Helper function for parameter type validation
const isValidParamType = (type: any): type is PipelineParameter['type'] => {
  return ['string', 'integer', 'boolean', 'path', 'file', 'directory'].includes(type);
};

const App: React.FC = () => {
  const [pipeline, setPipeline] = useState<Pipeline>(initialPipeline);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SETUP);

  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<PipelineParameter | null>(null);

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<NextflowProcess | null>(null);

  // State for AI Workflow Suggestion
  const [workflowGoalPrompt, setWorkflowGoalPrompt] = useState<string>('');
  const [suggestedWorkflowContent, setSuggestedWorkflowContent] = useState<string>('');
  const [isSuggestingWorkflow, setIsSuggestingWorkflow] = useState<boolean>(false);

  // State for AI Pipeline Genie
  const [isGenieModalOpen, setIsGenieModalOpen] = useState<boolean>(false);
  const [geniePipelineGoal, setGeniePipelineGoal] = useState<string>('');
  const [isGeneratingFullPipeline, setIsGeneratingFullPipeline] = useState<boolean>(false);
  const [fullPipelineSuggestion, setFullPipelineSuggestion] = useState<AIPipelineSuggestion | null>(null);
  const [genieError, setGenieError] = useState<string | null>(null);


  const updatePipelineField = <K extends keyof Pipeline,>(field: K, value: Pipeline[K]) => {
    setPipeline(prev => ({ ...prev, [field]: value }));
  };

  // Parameter Management
  const handleAddOrUpdateParameter = (param: PipelineParameter) => {
    setPipeline(prev => {
      const existingIndex = prev.parameters.findIndex(p => p.id === param.id);
      if (existingIndex > -1) {
        const newParams = [...prev.parameters];
        newParams[existingIndex] = param;
        return { ...prev, parameters: newParams };
      }
      return { ...prev, parameters: [...prev.parameters, param] };
    });
    setIsParamModalOpen(false);
    setEditingParam(null);
  };

  const handleEditParameter = (param: PipelineParameter) => {
    setEditingParam(param);
    setIsParamModalOpen(true);
  };

  const handleDeleteParameter = (paramId: string) => {
    if (window.confirm("Are you sure you want to delete this parameter?")) {
        setPipeline(prev => ({ ...prev, parameters: prev.parameters.filter(p => p.id !== paramId) }));
    }
  };

  // Process Management
  const handleAddOrUpdateProcess = (proc: NextflowProcess) => {
    setPipeline(prev => {
      const existingIndex = prev.processes.findIndex(p => p.id === proc.id);
      if (existingIndex > -1) {
        const newProcs = [...prev.processes];
        newProcs[existingIndex] = proc;
        return { ...prev, processes: newProcs };
      }
      return { ...prev, processes: [...prev.processes, proc] };
    });
    setIsProcessModalOpen(false);
    setEditingProcess(null);
  };

  const handleEditProcess = (proc: NextflowProcess) => {
    setEditingProcess(proc);
    setIsProcessModalOpen(true);
  };

  const handleDeleteProcess = (procId: string) => {
     if (window.confirm("Are you sure you want to delete this process?")) {
        setPipeline(prev => ({ ...prev, processes: prev.processes.filter(p => p.id !== procId) }));
    }
  };

  // AI Workflow Suggestion Handler
  const handleSuggestWorkflow = async () => {
    if (!workflowGoalPrompt.trim()) {
      alert("Please describe your pipeline goal for AI suggestion.");
      return;
    }
    setIsSuggestingWorkflow(true);
    setSuggestedWorkflowContent('');
    try {
      const processNames = pipeline.processes.map(p => p.name);
      const suggestion = await suggestNextflowWorkflow(workflowGoalPrompt, processNames);
      setSuggestedWorkflowContent(suggestion);
    } catch (error) {
      console.error("Workflow suggestion error:", error);
      setSuggestedWorkflowContent("Failed to get workflow suggestion. Check console for details.");
    } finally {
      setIsSuggestingWorkflow(false);
    }
  };

  const applyWorkflowSuggestion = () => {
    if (suggestedWorkflowContent && !suggestedWorkflowContent.startsWith("Error:")) {
      updatePipelineField('workflowContent', suggestedWorkflowContent);
    }
  };

  // AI Pipeline Genie Handlers
  const handleOpenGenieModal = () => {
    setGeniePipelineGoal('');
    setFullPipelineSuggestion(null);
    setGenieError(null);
    setIsGenieModalOpen(true);
  };

  const handleGenerateFullPipeline = async () => {
    if (!geniePipelineGoal.trim()) {
      alert("Please describe your overall pipeline goal.");
      return;
    }
    setIsGeneratingFullPipeline(true);
    setFullPipelineSuggestion(null);
    setGenieError(null);
    try {
      const suggestion = await suggestFullNextflowPipeline(geniePipelineGoal);
      if (typeof suggestion === 'string') { // Error message returned
        setGenieError(suggestion);
      } else {
        setFullPipelineSuggestion(suggestion);
      }
    } catch (error) {
      console.error("Full pipeline suggestion error:", error);
      setGenieError("An unexpected error occurred while generating the pipeline. Check console for details.");
    } finally {
      setIsGeneratingFullPipeline(false);
    }
  };

  const applyFullPipelineSuggestion = () => {
    if (!fullPipelineSuggestion) {
      console.warn("[AI GENIE] applyFullPipelineSuggestion called without fullPipelineSuggestion. Button should be disabled or hidden.");
      setGenieError("Cannot apply: No suggestion data available. Please generate a suggestion first.");
      return;
    }

    console.log("[AI GENIE] 'Apply This Suggestion' button clicked. Proceeding to apply suggestion as browser confirm dialog is bypassed for preview environments.");
    
    try {
        console.log("Applying full pipeline suggestion: ", fullPipelineSuggestion);
        const newParams: PipelineParameter[] = (fullPipelineSuggestion.parameters || [])
          .filter((p): p is AIPipelineParameterSuggestion => p && typeof p === 'object') 
          .map((p, index) => ({ 
            id: `param-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: String(p.name || `param_${index}`).trim().replace(/\s+/g, '_'),
            defaultValue: String(p.defaultValue || ''),
            description: String(p.description || ''),
            type: isValidParamType(p.type) ? p.type : 'string',
          }));
        console.log("Mapped newParams: ", newParams);

        const newProcs: NextflowProcess[] = (fullPipelineSuggestion.processes || [])
          .filter((p): p is AINextflowProcessSuggestion => p && typeof p === 'object') 
          .map((p, index) => ({ 
            id: `proc-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: String(p.name || `PROCESS_${index}`).trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''),
            description: String(p.description || ''),
            inputDeclarations: String(p.inputDeclarations || ''),
            outputDeclarations: String(p.outputDeclarations || ''),
            directiveDeclarations: String(p.directiveDeclarations || ''),
            script: String(p.script || ''),
          }));
        console.log("Mapped newProcs: ", newProcs);
        
        const newPipelineName = String(fullPipelineSuggestion.pipelineName || pipeline.name);
        const newPipelineDescription = String(fullPipelineSuggestion.pipelineDescription || pipeline.description);
        const newPipelineVersion = String(fullPipelineSuggestion.pipelineVersion || pipeline.version);
        const newWorkflowContent = String(fullPipelineSuggestion.workflowContent || pipeline.workflowContent);

        console.log("Preparing to call setPipeline");
        setPipeline(prev => ({
          ...prev,
          name: newPipelineName,
          description: newPipelineDescription,
          version: newPipelineVersion,
          parameters: newParams,
          processes: newProcs,
          workflowContent: newWorkflowContent,
        }));
        console.log("setPipeline call completed in terms of scheduling.");
        
        setIsGenieModalOpen(false);
        console.log("setIsGenieModalOpen(false) called.");
        
        setFullPipelineSuggestion(null);
        console.log("setFullPipelineSuggestion(null) called.");

        setGeniePipelineGoal('');
        console.log("setGeniePipelineGoal('') called.");

        setActiveTab(Tab.PREVIEW);
        console.log("setActiveTab(Tab.PREVIEW) called.");

      } catch (error) {
        console.error("Critical Error applying full pipeline suggestion:", error);
        let detailedErrorMessage = "An unknown error occurred while applying the suggestion.";
        if (error instanceof Error) {
            detailedErrorMessage = error.message;
            if (error.stack) { 
                detailedErrorMessage += `\nStack: ${error.stack}`;
            }
            if ((error as any).cause) { 
                detailedErrorMessage += `\nCause: ${String((error as any).cause)}`;
            }
        } else {
            detailedErrorMessage = String(error);
        }
        setGenieError(`Failed to apply suggestion: ${detailedErrorMessage || 'Unknown issue'}. Please check the browser console for details and report the full error.`);
      }
  };


  const TabButton: React.FC<{tabName: Tab, currentTab: Tab, setTab: (tab: Tab) => void, children: React.ReactNode}> = ({tabName, currentTab, setTab, children}) => (
    <Button
        variant={tabName === currentTab ? 'primary' : 'secondary'}
        onClick={() => setTab(tabName)}
        className={`flex-grow sm:flex-grow-0 ${tabName === currentTab ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-sky-500' : '' }`}
    >
        {children}
    </Button>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case Tab.SETUP:
        return (
          <Card title="Pipeline Setup" className="bg-gray-800">
            <Input
              label="Pipeline Name"
              value={pipeline.name}
              onChange={(e) => updatePipelineField('name', e.target.value)}
              placeholder="e.g., RNASeqAnalysis"
            />
            <Textarea
              label="Pipeline Description"
              value={pipeline.description}
              onChange={(e) => updatePipelineField('description', e.target.value)}
              rows={3}
              placeholder="A short description of your pipeline's purpose."
            />
            <Input
              label="Pipeline Version"
              value={pipeline.version}
              onChange={(e) => updatePipelineField('version', e.target.value)}
              placeholder="e.g., 1.0.0"
            />
          </Card>
        );
      case Tab.PARAMETERS:
        return (
          <Card title="Pipeline Parameters" className="bg-gray-800" actions={
            <Button onClick={() => { setEditingParam(null); setIsParamModalOpen(true); }} variant="primary" size="sm">
              Add Parameter
            </Button>
          }>
            {pipeline.parameters.length === 0 ? (
              <p className="text-gray-400">No parameters defined yet. Click "Add Parameter" to get started.</p>
            ) : (
              <ul className="space-y-3">
                {pipeline.parameters.map(param => (
                  <li key={param.id} className="p-3 bg-gray-700 rounded-md shadow flex justify-between items-center">
                    <div>
                      <strong className="text-sky-400">{param.name}</strong> ({param.type})
                      <span className="text-gray-300 italic block text-sm"> Default: {param.defaultValue || 'N/A'}</span>
                      {param.description && <p className="text-xs text-gray-400 mt-1">{param.description}</p>}
                    </div>
                    <div className="space-x-2">
                      <Button onClick={() => handleEditParameter(param)} variant="ghost" size="sm">Edit</Button>
                      <Button onClick={() => handleDeleteParameter(param.id)} variant="danger" size="sm">Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      case Tab.PROCESSES:
        return (
          <Card title="Pipeline Processes" className="bg-gray-800" actions={
             <Button onClick={() => { setEditingProcess(null); setIsProcessModalOpen(true); }} variant="primary" size="sm">
              Add Process
            </Button>
          }>
            {pipeline.processes.length === 0 ? (
              <p className="text-gray-400">No processes defined yet. Click "Add Process" to create one.</p>
            ) : (
              <ul className="space-y-3">
                {pipeline.processes.map(proc => (
                  <li key={proc.id} className="p-3 bg-gray-700 rounded-md shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <strong className="text-sky-400 text-lg">{proc.name}</strong>
                            {proc.description && <p className="text-xs text-gray-400 mt-1">{proc.description}</p>}
                        </div>
                        <div className="space-x-2 flex-shrink-0">
                            <Button onClick={() => handleEditProcess(proc)} variant="ghost" size="sm">Edit</Button>
                            <Button onClick={() => handleDeleteProcess(proc.id)} variant="danger" size="sm">Delete</Button>
                        </div>
                    </div>
                    <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-gray-400 hover:text-gray-200">View Details (Inputs, Outputs, Script...)</summary>
                        <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-600 space-y-1">
                            <p><strong className="text-gray-300">Inputs:</strong> <pre className="whitespace-pre-wrap text-gray-400 text-xs p-1 bg-gray-900 rounded">{proc.inputDeclarations || 'N/A'}</pre></p>
                            <p><strong className="text-gray-300">Outputs:</strong> <pre className="whitespace-pre-wrap text-gray-400 text-xs p-1 bg-gray-900 rounded">{proc.outputDeclarations || 'N/A'}</pre></p>
                            <p><strong className="text-gray-300">Directives:</strong> <pre className="whitespace-pre-wrap text-gray-400 text-xs p-1 bg-gray-900 rounded">{proc.directiveDeclarations || 'N/A'}</pre></p>
                            <p><strong className="text-gray-300">Script:</strong> <pre className="whitespace-pre-wrap text-gray-400 text-xs p-1 bg-gray-900 rounded">{proc.script ? proc.script.substring(0, 100) + (proc.script.length > 100 ? '...' : '') : 'N/A'}</pre></p>
                        </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      case Tab.WORKFLOW:
        return (
          <div className="space-y-6">
            <Card title="AI-Powered Workflow Suggestion" className="bg-gray-700/50">
              <Textarea
                label="Describe your overall pipeline goal (for workflow block only):"
                value={workflowGoalPrompt}
                onChange={(e) => setWorkflowGoalPrompt(e.target.value)}
                placeholder="e.g., Perform variant calling from FASTQ files, including QC, alignment, and SNP identification. (Assumes processes are already defined)"
                rows={3}
                containerClassName="mb-2"
              />
              <Button onClick={handleSuggestWorkflow} disabled={isSuggestingWorkflow || !workflowGoalPrompt.trim()} variant="ghost" size="sm">
                {isSuggestingWorkflow ? 'Thinking...' : 'Suggest Workflow Block with AI'}
              </Button>
              {suggestedWorkflowContent && (
                <div className="mt-4 p-3 bg-gray-800 rounded-md border border-gray-600">
                  <h4 className="text-sm font-semibold text-sky-400 mb-2">Gemini Workflow Suggestion:</h4>
                  <pre className="whitespace-pre-wrap text-xs text-gray-300 bg-gray-900 p-2 rounded max-h-60 overflow-y-auto">
                    {suggestedWorkflowContent}
                  </pre>
                  {!suggestedWorkflowContent.startsWith("Error:") && (
                    <Button onClick={applyWorkflowSuggestion} variant="primary" size="sm" className="mt-2">
                      Apply Suggestion to Workflow Block
                    </Button>
                  )}
                </div>
              )}
            </Card>
            <Card title="Workflow Definition" className="bg-gray-800">
              <p className="text-sm text-gray-400 mb-2">
                Define the main workflow logic here. Call your processes and manage channels.
                Example: <code>PROCESS_A( Channel.value(1) ); PROCESS_B( PROCESS_A.out.result_ch )</code>
              </p>
              <Textarea
                label="Workflow Block Content (inside workflow { ... })"
                value={pipeline.workflowContent}
                onChange={(e) => updatePipelineField('workflowContent', e.target.value)}
                rows={15}
                className="font-mono text-sm bg-gray-900"
                placeholder="your_process_name( Channel.fromPath(params.my_input) )"
              />
            </Card>
          </div>
        );
      case Tab.VISUALIZER:
        return <WorkflowVisualizer pipeline={pipeline} />;
      case Tab.CONFIG:
        return (
          <Card title="Nextflow Configuration (nextflow.config)" className="bg-gray-800">
            <p className="text-sm text-gray-400 mb-2">
              Add custom Nextflow configuration settings (e.g., profiles, process selectors, resource limits).
              This will be appended to a default configuration template.
            </p>
            <Textarea
              label="Custom nextflow.config Content"
              value={pipeline.nextflowConfigContent}
              onChange={(e) => updatePipelineField('nextflowConfigContent', e.target.value)}
              rows={15}
              className="font-mono text-sm bg-gray-900"
              placeholder="process.executor = 'local'\nparams.max_memory = '32.GB'"
            />
          </Card>
        );
      case Tab.PREVIEW:
        return <GeneratedCodeViewer pipeline={pipeline} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <div className="text-center sm:text-left">
                <h1 className="text-4xl font-bold text-sky-500">Nextflow Pipeline Builder</h1>
                <p className="text-lg text-gray-400 mt-1">Interactively design and generate your Nextflow pipelines.</p>
            </div>
            <Button 
                onClick={handleOpenGenieModal} 
                variant="ghost" 
                size="lg" 
                className="mt-4 sm:mt-0 border-sky-500 hover:bg-sky-700 hover:text-white"
                aria-label="Open AI Pipeline Genie"
            >
                ✨ AI Pipeline Genie
            </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-700 pb-4 justify-center">
        {Object.values(Tab).map(tabKey => (
            <TabButton key={tabKey} tabName={tabKey} currentTab={activeTab} setTab={setActiveTab}>
                {tabKey}
            </TabButton>
        ))}
      </div>

      <main>
        {renderActiveTabContent()}
      </main>

      {isParamModalOpen && (
        <Modal
          isOpen={isParamModalOpen}
          onClose={() => { setIsParamModalOpen(false); setEditingParam(null); }}
          title={editingParam ? 'Edit Parameter' : 'Add New Parameter'}
          size="lg"
        >
          <ParameterEditor
            parameter={editingParam}
            onSave={handleAddOrUpdateParameter}
            onCancel={() => { setIsParamModalOpen(false); setEditingParam(null); }}
          />
        </Modal>
      )}

      {isProcessModalOpen && (
        <Modal
          isOpen={isProcessModalOpen}
          onClose={() => { setIsProcessModalOpen(false); setEditingProcess(null); }}
          title={editingProcess ? 'Edit Process' : 'Add New Process'}
          size="3xl"
        >
          <ProcessEditor
            process={editingProcess}
            onSave={handleAddOrUpdateProcess}
            onCancel={() => { setIsProcessModalOpen(false); setEditingProcess(null); }}
          />
        </Modal>
      )}

      {isGenieModalOpen && (
        <Modal
            isOpen={isGenieModalOpen}
            onClose={() => setIsGenieModalOpen(false)}
            title="✨ AI Pipeline Genie - Full Pipeline Suggestion"
            size="2xl" 
        >
            <div className="space-y-4">
                {/* Prominent error display area */}
                {genieError && (
                    <div className="p-4 mb-4 text-sm text-red-200 bg-red-800 border border-red-700 rounded-md shadow-lg" role="alert">
                        <strong className="font-bold">An error occurred:</strong>
                        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{genieError}</pre>
                    </div>
                )}

                <Textarea
                    label="Describe your desired pipeline goal:"
                    value={geniePipelineGoal}
                    onChange={(e) => setGeniePipelineGoal(e.target.value)}
                    placeholder="e.g., 'RNA-seq analysis from FASTQ to differential gene expression', or 'Assemble a metagenome from short reads and perform functional annotation'"
                    rows={4}
                />
                <Button
                    onClick={handleGenerateFullPipeline}
                    disabled={isGeneratingFullPipeline || !geniePipelineGoal.trim()}
                    variant="primary"
                    className="w-full"
                >
                    {isGeneratingFullPipeline ? 'Generating Pipeline...' : 'Ask AI to Generate Pipeline'}
                </Button>

                {/* Conditional display of suggestion, now separate from the main error display */}
                {fullPipelineSuggestion && !genieError && ( // Only show suggestion if no error and suggestion exists
                    <Card title="AI Suggested Pipeline Structure" className="bg-gray-700/70 max-h-[50vh] overflow-y-auto">
                        <h4 className="text-md font-semibold text-sky-400 mb-1">Name: <span className="font-normal text-gray-200">{fullPipelineSuggestion.pipelineName}</span></h4>
                        <p className="text-sm text-gray-300 mb-1"><strong className="text-gray-200">Description:</strong> {fullPipelineSuggestion.pipelineDescription}</p>
                        {fullPipelineSuggestion.pipelineVersion && <p className="text-sm text-gray-300 mb-3"><strong className="text-gray-200">Version:</strong> {fullPipelineSuggestion.pipelineVersion}</p>}
                        
                        <details className="mb-2">
                            <summary className="text-sm font-semibold text-sky-400 cursor-pointer">Parameters ({fullPipelineSuggestion.parameters?.length || 0})</summary>
                            <ul className="list-disc list-inside pl-4 text-xs mt-1">
                                {(fullPipelineSuggestion.parameters || []).map((p, i) => <li key={i} className="text-gray-300"><strong>{p.name}</strong> ({p.type}): {p.defaultValue} <em>({p.description})</em></li>)}
                            </ul>
                        </details>
                        <details className="mb-2">
                            <summary className="text-sm font-semibold text-sky-400 cursor-pointer">Processes ({fullPipelineSuggestion.processes?.length || 0})</summary>
                             <ul className="list-disc list-inside pl-4 text-xs mt-1 space-y-1">
                                {(fullPipelineSuggestion.processes || []).map((p, i) => <li key={i} className="text-gray-300"><strong>{p.name}</strong>: {p.description}</li>)}
                            </ul>
                        </details>
                         <details className="mb-2">
                            <summary className="text-sm font-semibold text-sky-400 cursor-pointer">Workflow Content Preview</summary>
                            <pre className="whitespace-pre-wrap text-xs text-gray-300 bg-gray-800 p-2 rounded mt-1 max-h-40 overflow-y-auto">
                                {fullPipelineSuggestion.workflowContent}
                            </pre>
                        </details>
                        
                        {/* Removed the specific browser confirmation reminder as it's no longer applicable with window.confirm removed */}
                        <Button onClick={applyFullPipelineSuggestion} variant="primary" className="w-full mt-3" disabled={!fullPipelineSuggestion}>
                            Apply This Suggestion
                        </Button>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            This will overwrite your current pipeline. Clicking "Apply" is your confirmation.
                        </p>
                    </Card>
                )}
            </div>
        </Modal>
      )}


      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Nextflow Pipeline Builder. Powered by AI.</p>
      </footer>
    </div>
  );
};

export default App;
