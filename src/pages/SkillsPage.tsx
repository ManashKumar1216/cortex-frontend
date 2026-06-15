import { useState, type FormEvent } from 'react'

import { Lock, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'

import {
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useUpdateSkill,
  type AgentSkill,
  type SkillInput,
} from '../api/skills'
import { Modal } from '../components/Modal'
import { PageHeader, useConfirm, useToast } from '../components/ui'

export function SkillsPage() {
  const skills = useSkills()
  const [editing, setEditing] = useState<AgentSkill | null>(null)
  const [creating, setCreating] = useState(false)

  const list = skills.data ?? []
  const builtins = list.filter((s) => s.source === 'builtin')
  const custom = list.filter((s) => s.source !== 'builtin')

  return (
    <div>
      <PageHeader
        title="Skills"
        subtitle="Reusable workflows that prime the agent. Built-in ones plus your own — Cortex grows with you."
        action={
          <button className="btn primary sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New skill
          </button>
        }
      />

      {skills.isPending && <p className="muted">Loading…</p>}
      {skills.isError && <p className="error">{(skills.error as Error).message}</p>}

      {custom.length > 0 && (
        <section className="skill-section">
          <h2 className="skill-section-title">Your skills</h2>
          <div className="skill-list">
            {custom.map((s) => (
              <SkillCard key={s.slug} skill={s} onEdit={() => setEditing(s)} />
            ))}
          </div>
        </section>
      )}

      <section className="skill-section">
        <h2 className="skill-section-title">Built-in</h2>
        <div className="skill-list">
          {builtins.map((s) => (
            <SkillCard key={s.slug} skill={s} />
          ))}
        </div>
      </section>

      {creating && <SkillModal onClose={() => setCreating(false)} />}
      {editing && <SkillModal skill={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function SkillCard({ skill, onEdit }: { skill: AgentSkill; onEdit?: () => void }) {
  const editable = skill.source !== 'builtin'
  return (
    <div className={`card skill-card${skill.enabled === false ? ' disabled' : ''}`}>
      <div className="skill-card-head">
        <span className="skill-card-title">
          <Sparkles size={14} /> {skill.title}
        </span>
        <span className={`skill-badge src-${skill.source}`}>
          {skill.source === 'builtin' ? (
            <>
              <Lock size={11} /> built-in
            </>
          ) : (
            skill.source
          )}
        </span>
      </div>
      {skill.description && <p className="skill-card-desc muted small">{skill.description}</p>}
      <div className="skill-card-foot">
        <span className="muted small">
          {skill.allowedTools.length} tool{skill.allowedTools.length === 1 ? '' : 's'}
          {typeof skill.uses === 'number' ? ` · used ${skill.uses}×` : ''}
        </span>
        {editable && onEdit && (
          <button className="btn ghost xs" onClick={onEdit}>
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
    </div>
  )
}

function SkillModal({ skill, onClose }: { skill?: AgentSkill; onClose: () => void }) {
  const create = useCreateSkill()
  const update = useUpdateSkill()
  const del = useDeleteSkill()
  const toast = useToast()
  const confirm = useConfirm()
  const isEdit = !!skill

  const [title, setTitle] = useState(skill?.title ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [goal, setGoal] = useState(skill?.goal ?? '')
  const [tools, setTools] = useState((skill?.allowedTools ?? []).join(', '))
  const [cap, setCap] = useState(String(skill?.iterationCap ?? 6))

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    const body: SkillInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      goal: goal.trim(),
      allowedTools: tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      iterationCap: Number(cap) || 6,
    }
    if (!body.title || !body.goal) return
    const done = {
      onSuccess: () => {
        toast.show(isEdit ? 'Skill updated' : 'Skill created')
        onClose()
      },
      onError: (err: unknown) => toast.show((err as Error).message, 'error'),
    }
    if (isEdit && skill) update.mutate({ slug: skill.slug, body }, done)
    else create.mutate(body, done)
  }

  const remove = async (): Promise<void> => {
    if (!skill) return
    const ok = await confirm({ message: `Delete skill "${skill.title}"?`, danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    del.mutate(skill.slug, {
      onSuccess: () => {
        toast.show('Skill deleted')
        onClose()
      },
    })
  }

  return (
    <Modal title={isEdit ? 'Edit skill' : 'New skill'} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Plan my sprint" />
        </label>
        <label className="field">
          <span>Description</span>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One-line summary shown in the picker" />
        </label>
        <label className="field">
          <span>Goal (numbered steps for the agent)</span>
          <textarea className="input" rows={4} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Steps: 1) … 2) … Propose ONE write at a time." />
        </label>
        <div className="skill-form-row">
          <label className="field">
            <span>Allowed tools (comma-separated)</span>
            <input className="input" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="list_tasks, create_task" />
          </label>
          <label className="field skill-cap">
            <span>Max steps</span>
            <input className="input" type="number" min={1} max={20} value={cap} onChange={(e) => setCap(e.target.value)} />
          </label>
        </div>
        <div className="form-actions skill-modal-actions">
          {isEdit && (
            <button type="button" className="btn ghost danger" onClick={() => void remove()}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!title.trim() || !goal.trim() || create.isPending || update.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
