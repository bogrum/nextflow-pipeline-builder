
import React, { useState, useEffect } from 'react';
import { Pipeline } from '../types';
import { generateNextflowScript, generateNextflowConfig } from '../services/nextflowGeneratorService';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface CodeBlockProps {
  title: string;
  code: string | null;
  fileName: string;
  error?: string | null;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ title, code, fileName, error }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (code && !error) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text. See console for details.');
      }
    }
  };

  const handleDownload = () => {
    if (code && !error) {
      try {
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download file: ', err);
        alert('Failed to download file. See console for details.');
      }
    }
  };

  return (
    <Card title={title} className="mb-6 bg-gray-800" actions={
      code && !error && (
        <div className="flex space-x-2">
          <Button onClick={handleCopy} variant="ghost" size="sm">
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Button onClick={handleDownload} variant="ghost" size="sm">
            Download File
          </Button>
        </div>
      )
    }>
      {error ? (
        <div className="p-4 text-red-400 bg-red-900/30 rounded-md">
          <p className="font-semibold">Error generating {title}:</p>
          <pre className="whitespace-pre-wrap text-sm mt-1">{error}</pre>
        </div>
      ) : code !== null ? (
        <pre className="p-4 bg-gray-900 text-gray-200 rounded-md overflow-x-auto text-sm max-h-[600px]">
          <code>{code}</code>
        </pre>
      ) : (
         <p className="p-4 text-gray-400">Generating code...</p>
      )}
    </Card>
  );
};

// Fix: Define GeneratedCodeViewerProps interface
interface GeneratedCodeViewerProps {
  pipeline: Pipeline;
}

export const GeneratedCodeViewer: React.FC<GeneratedCodeViewerProps> = ({ pipeline }) => {
  const [mainNfContent, setMainNfContent] = useState<string | null>(null);
  const [nextflowConfigContent, setNextflowConfigContent] = useState<string | null>(null);
  const [mainNfError, setMainNfError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setMainNfError(null);
    setConfigError(null);
    setMainNfContent(null); 
    setNextflowConfigContent(null);

    try {
      const script = generateNextflowScript(pipeline);
      setMainNfContent(script);
    } catch (e) {
      console.error("Error generating main.nf:", e);
      setMainNfError(e instanceof Error ? e.message : String(e));
      setMainNfContent(''); 
    }

    try {
      const config = generateNextflowConfig(pipeline);
      setNextflowConfigContent(config);
    } catch (e) {
      console.error("Error generating nextflow.config:", e);
      setConfigError(e instanceof Error ? e.message : String(e));
      setNextflowConfigContent(''); 
    }
  }, [pipeline]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6">Generated Nextflow Files</h2>
      <CodeBlock title="main.nf" code={mainNfContent} fileName="main.nf" error={mainNfError} />
      <CodeBlock title="nextflow.config" code={nextflowConfigContent} fileName="nextflow.config" error={configError} />
    </div>
  );
};