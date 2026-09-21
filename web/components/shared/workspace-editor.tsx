import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { briefLabels } from '@/lib/data';
import type { Editor } from '@/components/workspace/workspace-types';

export function WorkspaceEditor({
  editor,
  reason,
  dirty,
  onEditorChange,
  onReasonChange,
  onSave,
  onCancel,
}: {
  editor: Editor;
  reason: string;
  dirty: boolean;
  onEditorChange: (editor: Editor) => void;
  onReasonChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const labels =
    editor.kind === 'brand'
      ? {
          positioning: '品牌定位',
          audiences: '核心人群（每行一项）',
          goals: '营销目标（每行一项）',
        }
      : briefLabels;
  return (
    <div className="editor">
      <div className="section-label">
        编辑本机副本 <span>原始内容保留</span>
      </div>
      {Object.entries(labels).map(([key, label]) => (
        <div className="field" key={key}>
          <label htmlFor={`editor-${key}`}>{label}</label>
          <Textarea
            id={`editor-${key}`}
            value={(editor.draft as unknown as Record<string, string>)[key]}
            maxLength={5000}
            onChange={(event) =>
              onEditorChange({
                ...editor,
                draft: { ...editor.draft, [key]: event.target.value },
              } as Editor)
            }
          />
        </div>
      ))}
      <div className="field">
        <label htmlFor="editor-reason">
          修改理由 <span>必填</span>
        </label>
        <Textarea
          id="editor-reason"
          value={reason}
          maxLength={1000}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="为什么调整？希望改善什么？"
        />
      </div>
      <div className="actions">
        <Button className="primary" onClick={onSave}>
          保存副本
        </Button>
        <Button className="secondary" onClick={onCancel}>
          取消编辑
        </Button>
        <span className="micro">
          {dirty ? '有未保存修改' : '尚未修改'} · 仅当前浏览器
        </span>
      </div>
    </div>
  );
}
