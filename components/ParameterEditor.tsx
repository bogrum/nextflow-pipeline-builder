
import React, { useState, useEffect } from 'react';
import { PipelineParameter } from '../types';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { Select } from './ui/Select';

interface ParameterEditorProps {
  parameter: PipelineParameter | null;
  onSave: (parameter: PipelineParameter) => void;
  onCancel: () => void;
}

const initialParameterState: PipelineParameter = {
  id: '',
  name: '',
  defaultValue: '',
  description: '',
  type: 'string',
};

export const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameter, onSave, onCancel }) => {
  const [currentParam, setCurrentParam] = useState<PipelineParameter>(initialParameterState);

  useEffect(() => {
    if (parameter) {
      setCurrentParam(parameter);
    } else {
      setCurrentParam({ ...initialParameterState, id: Date.now().toString() + Math.random().toString(36).substring(2,7) });
    }
  }, [parameter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentParam(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentParam.name.trim()) {
      alert("Parameter name cannot be empty.");
      return;
    }
    onSave(currentParam);
  };

  const typeOptions = [
    { value: 'string', label: 'String' },
    { value: 'integer', label: 'Integer' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'path', label: 'Path (generic)' },
    { value: 'file', label: 'File' },
    { value: 'directory', label: 'Directory' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Parameter Name (e.g., input_reads, threshold)"
        name="name"
        value={currentParam.name}
        onChange={handleChange}
        placeholder="my_param_name"
        required
      />
      <Select
        label="Parameter Type"
        name="type"
        value={currentParam.type}
        onChange={handleChange}
        options={typeOptions}
      />
      <Input
        label="Default Value"
        name="defaultValue"
        value={currentParam.defaultValue}
        onChange={handleChange}
        placeholder={currentParam.type === 'boolean' ? 'true / false' : 'Default value'}
      />
      <Textarea
        label="Description"
        name="description"
        value={currentParam.description}
        onChange={handleChange}
        placeholder="Brief description of the parameter"
        rows={2}
      />
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{parameter ? 'Save Changes' : 'Add Parameter'}</Button>
      </div>
    </form>
  );
};
    