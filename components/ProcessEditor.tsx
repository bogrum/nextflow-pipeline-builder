
import React, { useState, useEffect, useCallback } from 'react';
import { NextflowProcess, ProcessTemplate } from '../types';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Select } from './ui/Select';
import { suggestNextflowProcessParts } from '../services/geminiService';
import { processTemplates } from '../data/processTemplates'; // Import templates

interface ProcessEditorProps {
  process: NextflowProcess | null;
  onSave: (process: NextflowProcess) => void;
  onCancel: () => void;
  isApiConfigured: boolean; // New prop
}

const initialProcessState: NextflowProcess = {
  id: '',
  name: '',
  description: '',
  inputDeclarations: '',
  outputDeclarations: '',
  directiveDeclarations: '',
  script: '',
};

export const ProcessEditor: React.FC<ProcessEditorProps> = ({ process, onSave, onCancel, isApiConfigured }) => {
  const [currentProc, setCurrentProc] = useState<NextflowProcess>(initialProcessState);
  const [geminiTaskDesc, setGeminiTaskDesc] = useState('');
  const [geminiSuggestion, setGeminiSuggestion] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    if (process) {
      setCurrentProc(process);
      setSelectedTemplate(''); 
    } else {
      setCurrentProc({ ...initialProcessState, id: Date.now().toString() + Math.random().toString(36).substring(2,7) });
    }
  }, [process]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProc(prev => ({ ...prev, [name]: value }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    setSelectedTemplate(templateName);
    const template = processTemplates.find(t => t.templateName === templateName);
    if (template) {
      setCurrentProc(prev => ({
        ...prev,
        name: template.processNameSuggestion || prev.name,
        description: template.description || '',
        inputDeclarations: template.inputDeclarations || '',
        outputDeclarations: template.outputDeclarations || '',
        directiveDeclarations: template.directiveDeclarations || '',
        script: template.script || '',
      }));
    } else if (templateName === "") { 
       if (!process) {
        setCurrentProc(prev => ({ ...initialProcessState, id: prev.id }));
       }
    }
  };

  const handleGeminiSuggest = async () => {
    if (!isApiConfigured) {
        setGeminiSuggestion("AI features are disabled. API Key not configured.");
        return;
    }
    if (!geminiTaskDesc.trim()) {
      alert("Please describe the task for the process.");
      return;
    }
    setIsSuggesting(true);
    setGeminiSuggestion('');
    try {
      const suggestion = await suggestNextflowProcessParts(geminiTaskDesc);
      setGeminiSuggestion(suggestion);
    } catch (error) {
      console.error("Gemini suggestion error:", error);
      setGeminiSuggestion("Failed to get suggestions. Check console for details.");
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const extractBlock = (suggestionText: string, blockName: string): string => {
    const regex = new RegExp(`\`\`\`nextflow_${blockName}\\s*\\n?([\\s\\S]*?)\\n?\\s*\`\`\``, 's');
    const match = suggestionText.match(regex);
    if (match && match[1]) {
      if (blockName === 'script') {
        const scriptContentMatch = match[1].match(/script:\s*"""\s*([\s\\S]*?)\s*"""/s);
        return scriptContentMatch && scriptContentMatch[1] ? scriptContentMatch[1].trim() : '';
      }
      return match[1].trim();
    }
    return '';
  };

  const applySuggestionPart = (partName: 'inputDeclarations' | 'outputDeclarations' | 'directiveDeclarations' | 'script') => {
    if (!geminiSuggestion || geminiSuggestion.startsWith("Error:")) return;
    let extractedContent = '';
    switch(partName) {
        case 'inputDeclarations':
            extractedContent = extractBlock(geminiSuggestion, 'input');
            break;
        case 'outputDeclarations':
            extractedContent = extractBlock(geminiSuggestion, 'output');
            break;
        case 'directiveDeclarations':
            extractedContent = extractBlock(geminiSuggestion, 'directive');
            break;
        case 'script':
            extractedContent = extractBlock(geminiSuggestion, 'script');
            break;
    }
    if (extractedContent) {
        setCurrentProc(prev => ({ ...prev, [partName]: extractedContent }));
    } else {
        alert(`Could not find or parse ${partName} from suggestion.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = currentProc.name.trim();
    if (!trimmedName) {
      alert("Process name cannot be empty.");
      return;
    }
    onSave({ ...currentProc, name: trimmedName });
  };
  
  const templateOptions = [
    { value: "", label: "None - Start from scratch" },
    ...processTemplates.map(t => ({ value: t.templateName, label: `${t.templateName} - ${t.templateDescription}` }))
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!process && ( 
          <Select
            label="Load Process Template"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            options={templateOptions}
            containerClassName="mb-4"
          />
      )}
      <Input
        label="Process Name (e.g., ALIGN_READS, QC_STATS)"
        name="name"
        value={currentProc.name}
        onChange={handleChange}
        placeholder="MY_PROCESS_NAME"
        required
      />
      <Textarea
        label="Process Description"
        name="description"
        value={currentProc.description}
        onChange={handleChange}
        placeholder="Brief description of what this process does"
        rows={2}
      />

      <Card title="Gemini Script Suggester" className="bg-gray-700/50">
        <Textarea
          label="Describe the task this process should perform (for Gemini):"
          value={geminiTaskDesc}
          onChange={(e) => setGeminiTaskDesc(e.target.value)}
          placeholder="e.g., Align FASTQ reads to a reference genome using BWA-MEM"
          rows={2}
          containerClassName="mb-2"
          disabled={!isApiConfigured}
        />
        <Button 
            type="button" 
            onClick={handleGeminiSuggest} 
            disabled={isSuggesting || !geminiTaskDesc.trim() || !isApiConfigured} 
            variant="ghost" 
            size="sm"
            title={!isApiConfigured ? "AI suggestions disabled: API Key not configured" : "Get AI suggestions"}
        >
          {isSuggesting ? 'Suggesting...' : (!isApiConfigured ? 'AI Disabled (No API Key)' : 'Get AI Suggestions for Process Parts')}
        </Button>
        {geminiSuggestion && (
          <div className="mt-4 p-3 bg-gray-800 rounded-md border border-gray-600">
            <h4 className="text-sm font-semibold text-sky-400 mb-2">Gemini Suggestion:</h4>
            <pre className="whitespace-pre-wrap text-xs text-gray-300 bg-gray-900 p-2 rounded max-h-60 overflow-y-auto">{geminiSuggestion}</pre>
            {!geminiSuggestion.startsWith("Error:") && isApiConfigured && (
                <div className="mt-2 space-x-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => applySuggestionPart('inputDeclarations')}>Apply Inputs</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => applySuggestionPart('outputDeclarations')}>Apply Outputs</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => applySuggestionPart('directiveDeclarations')}>Apply Directives</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => applySuggestionPart('script')}>Apply Script</Button>
                </div>
            )}
          </div>
        )}
      </Card>

      <Textarea
        label="Input Declarations (one per line)"
        name="inputDeclarations"
        value={currentProc.inputDeclarations}
        onChange={handleChange}
        placeholder={`Example:\ntuple val(meta), path(reads)\nval flag`}
        rows={3}
        className="font-mono text-sm"
      />
      <Textarea
        label="Output Declarations (one per line)"
        name="outputDeclarations"
        value={currentProc.outputDeclarations}
        onChange={handleChange}
        placeholder={`Example:\ntuple val(meta), path("*.bam"), emit: bams\npath "report.html"`}
        rows={3}
        className="font-mono text-sm"
      />
       <Textarea
        label="Directive Declarations (one per line)"
        name="directiveDeclarations"
        value={currentProc.directiveDeclarations}
        onChange={handleChange}
        placeholder={`Example:\npublishDir params.outdir, mode: 'copy'\ntag "\${meta.id}"`}
        rows={3}
        className="font-mono text-sm"
      />
      <Textarea
        label="Script Content (Shell commands)"
        name="script"
        value={currentProc.script}
        onChange={handleChange}
        placeholder={`Example:\nbwa mem ref.fa read1.fq read2.fq > aligned.sam`}
        rows={8}
        className="font-mono text-sm"
      />
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{process ? 'Save Changes' : 'Add Process'}</Button>
      </div>
    </form>
  );
};
