import { useTranslation } from 'react-i18next';
import type { Node } from '@xyflow/react';

import type { WorkflowNode, WorkflowStepConfig } from '@/features/workflow/types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface StepConfigPanelProps {
  selectedNode: Node | null | undefined;
  onConfigChange: (key: string, value: unknown) => void;
  onLabelChange: (label: string) => void;
}

export function StepConfigPanel({ selectedNode, onConfigChange, onLabelChange }: StepConfigPanelProps) {
  const { t } = useTranslation();

  if (!selectedNode) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('workflow.select_step_hint', 'Select a step on the canvas to configure it.')}
      </p>
    );
  }

  const data = selectedNode.data as WorkflowNode['data'];
  const config = data.config as WorkflowStepConfig | undefined;

  const headerChange = (index: number, field: 'key' | 'value', val: string) => {
    const headers = [...(config?.headers ?? [])];
    headers[index] = { ...headers[index], [field]: val };
    onConfigChange('headers', headers);
  };

  const addHeader = () => {
    const headers = [...(config?.headers ?? []), { key: '', value: '' }];
    onConfigChange('headers', headers);
  };

  const removeHeader = (index: number) => {
    const headers = (config?.headers ?? []).filter((_, i) => i !== index);
    onConfigChange('headers', headers);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('workflow.step_config', 'Step Config')}
      </h3>

      <div className="space-y-2">
        <Label className="text-xs">{t('workflow.step_label', 'Label')}</Label>
        <Input
          value={data.label ?? ''}
          onChange={(e) => onLabelChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {data.stepType === 'http' && (
        <HttpConfigForm
          config={config}
          onChange={onConfigChange}
          onHeaderChange={headerChange}
          onAddHeader={addHeader}
          onRemoveHeader={removeHeader}
        />
      )}

      {data.stepType === 'condition' && (
        <ConditionConfigForm
          config={config}
          onChange={onConfigChange}
        />
      )}

      {data.stepType === 'delay' && (
        <DelayConfigForm
          config={config}
          onChange={onConfigChange}
        />
      )}

      {data.stepType === 'notification' && (
        <NotificationConfigForm
          config={config}
          onChange={onConfigChange}
        />
      )}
    </div>
  );
}

function HttpConfigForm({
  config,
  onChange,
  onHeaderChange,
  onAddHeader,
  onRemoveHeader,
}: {
  config?: WorkflowStepConfig;
  onChange: (key: string, value: unknown) => void;
  onHeaderChange: (index: number, field: 'key' | 'value', val: string) => void;
  onAddHeader: () => void;
  onRemoveHeader: (index: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.method', 'Method')}</Label>
        <Select value={config?.method ?? 'GET'} onValueChange={(v) => onChange('method', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.url', 'URL Template')}</Label>
        <Input
          value={config?.urlTemplate ?? ''}
          onChange={(e) => onChange('urlTemplate', e.target.value)}
          className="h-8 text-xs font-mono"
          placeholder="https://api.example.com/{{path}}"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.body', 'Body Template')}</Label>
        <textarea
          value={config?.bodyTemplate ?? ''}
          onChange={(e) => onChange('bodyTemplate', e.target.value)}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-mono min-h-[60px] resize-y"
          placeholder='{"key": "{{value}}"}'
          rows={3}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('workflow.headers', 'Headers')}</Label>
          <Button variant="ghost" size="sm" onClick={onAddHeader} className="h-6 text-xs">
            +
          </Button>
        </div>
        {(config?.headers ?? []).map((h, i) => (
          <div key={i} className="flex gap-1">
            <Input
              value={h.key}
              onChange={(e) => onHeaderChange(i, 'key', e.target.value)}
              className="h-7 text-xs flex-1"
              placeholder="Key"
            />
            <Input
              value={h.value}
              onChange={(e) => onHeaderChange(i, 'value', e.target.value)}
              className="h-7 text-xs flex-[2]"
              placeholder="Value"
            />
            <Button variant="ghost" size="icon-sm" onClick={() => onRemoveHeader(i)} className="shrink-0 h-7 w-7 text-destructive">
              x
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionConfigForm({
  config,
  onChange,
}: {
  config?: WorkflowStepConfig;
  onChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.condition_field', 'Field')}</Label>
        <Input
          value={config?.field ?? ''}
          onChange={(e) => onChange('field', e.target.value)}
          className="h-8 text-xs"
          placeholder="status"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.condition_operator', 'Operator')}</Label>
        <Select value={config?.operator ?? 'eq'} onValueChange={(v) => onChange('operator', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: 'eq', label: 'Equals (==)' },
              { value: 'neq', label: 'Not Equals (!=)' },
              { value: 'contains', label: 'Contains' },
              { value: 'gt', label: 'Greater Than (>)' },
              { value: 'lt', label: 'Less Than (<)' },
              { value: 'gte', label: 'Greater or Equal (>=)' },
              { value: 'lte', label: 'Less or Equal (<=)' },
            ].map((op) => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.condition_value', 'Value')}</Label>
        <Input
          value={config?.value ?? ''}
          onChange={(e) => onChange('value', e.target.value)}
          className="h-8 text-xs"
          placeholder="200"
        />
      </div>
    </div>
  );
}

function DelayConfigForm({
  config,
  onChange,
}: {
  config?: WorkflowStepConfig;
  onChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.delay_duration', 'Duration')}</Label>
        <Input
          type="number"
          value={config?.duration ?? ''}
          onChange={(e) => onChange('duration', Number(e.target.value))}
          className="h-8 text-xs"
          placeholder="1000"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.delay_unit', 'Unit')}</Label>
        <Select value={config?.unit ?? 'ms'} onValueChange={(v) => onChange('unit', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ms">Milliseconds</SelectItem>
            <SelectItem value="s">Seconds</SelectItem>
            <SelectItem value="m">Minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function NotificationConfigForm({
  config,
  onChange,
}: {
  config?: WorkflowStepConfig;
  onChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.notification_title', 'Title')}</Label>
        <Input
          value={config?.title ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="h-8 text-xs"
          placeholder="Alert"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.notification_message', 'Message')}</Label>
        <Input
          value={config?.message ?? ''}
          onChange={(e) => onChange('message', e.target.value)}
          className="h-8 text-xs"
          placeholder="Workflow step completed"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('workflow.notification_target', 'Target')}</Label>
        <Select value={config?.target ?? 'toast'} onValueChange={(v) => onChange('target', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toast">Toast</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
