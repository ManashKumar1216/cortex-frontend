import { useState, type FormEvent } from 'react'

import { Pencil, Plus, Power, RotateCcw, Sparkles, Trash2, Wrench } from 'lucide-react'

import {
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useUpdateSkill,
  type AgentSkill,
  type SkillInput,
} from '../api/skills'
import { Modal } from '../components/Modal'
import { ToolPicker } from '../components/ToolPicker'
import { PageHeader, useConfirm, useToast } from '../components/ui'

const isBuiltin = (s: AgentSkill): boolean => s.builtin ?? s.source === 'builtin'

export function SkillsPage() {
  const skills = useSkills()
  const update = useUpdateSkill()
  const toast = useToast()
  const [editing, setEditing] = useState<AgentSkill | null>(null)
  const [creating, setCreating] = useState(false)

  const list = skills.data ?? []
  const builtins = list.filter(isBuiltin)
  const custom = list.filter((s) => !isBuiltin(s))

  const toggle = (s: AgentSkill) => {
    const next = s.enabled === false
    update.mutate(
      { slug: s.slug, body: { enabled: next } },
      { onSuccess: () => toast.show(next ? 'Skill enabled' : 'Skill disabled') },
    )
  }

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
              <SkillCard key={s.slug} skill={s} onEdit={() => setEditing(s)} onToggle={() => toggle(s)} />
            ))}
          </div>
        </section>
      )}

      <section className="skill-section">
        <h2 className="skill-section-title">Built-in</h2>
        <div className="skill-list">
          {builtins.map((s) => (
            <SkillCard key={s.slug} skill={s} onEdit={() => setEditing(s)} onToggle={() => toggle(s)} />
          ))}
        </div>
      </section>

      {creating && <SkillModal onClose={() => setCreating(false)} />}
      {editing && <SkillModal skill={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function SkillCard({
  skill,
  onEdit,
  onToggle,
}: {
  skill: AgentSkill
  onEdit: () => void
  onToggle: () => void
}) {
  const builtin = isBuiltin(skill)
  const disabled = skill.enabled === false
  return (
    <div className={`card skill-card${disabled ? ' disabled' : ''}`}>
      <div className="skill-card-head">
        <span className="skill-card-title">
          <Sparkles size={14} /> {skill.title}
        </span>
        <span className="skill-card-badges">
          {builtin && <span className="skill-badge src-builtin">built-in</span>}
          {builtin && skill.customized && <span className="skill-badge src-custom">customized</span>}
          {disabled && <span className="skill-badge src-off">paused</span>}
        </span>
      </div>
      {skill.description && <p className="skill-card-desc muted small">{skill.description}</p>}
      <div className="skill-card-foot">
        <span className="muted small">
          {skill.allowedTools.length} tool{skill.allowedTools.length === 1 ? '' : 's'}
          {typeof skill.uses === 'number' ? ` · used ${skill.uses}×` : ''}
        </span>
        <span className="skill-card-actions">
          <button className="btn ghost xs" onClick={onToggle} title={disabled ? 'Enable' : 'Disable'}>
            <Power size={12} /> {disabled ? 'Enable' : 'Disable'}
          </button>
          <button className="btn ghost xs" onClick={onEdit}>
            <Pencil size={12} /> Edit
          </button>
        </span>
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
  const builtin = skill ? isBuiltin(skill) : false
  const canReset = !!skill && builtin && (skill.customized || skill.enabled === false)

  const [title, setTitle] = useState(skill?.title ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [goal, setGoal] = useState(skill?.goal ?? '')
  const [tools, setTools] = useState<string[]>(skill?.allowedTools ?? [])
  const [cap, setCap] = useState(String(skill?.iterationCap ?? 6))

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    const body: SkillInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      goal: goal.trim(),
      allowedTools: tools,
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

  // For a user skill this deletes it; for a customized builtin it resets to default.
  const removeOrReset = async (): Promise<void> => {
    if (!skill) return
    const ok = await confirm(
      builtin
        ? { message: `Reset "${skill.title}" to its built-in default? Your changes will be discarded.`, confirmLabel: 'Reset' }
        : { message: `Delete skill "${skill.title}"?`, danger: true, confirmLabel: 'Delete' },
    )
    if (!ok) return
    del.mutate(skill.slug, {
      onSuccess: () => {
        toast.show(builtin ? 'Reset to built-in' : 'Skill deleted')
        onClose()
      },
      onError: (err: unknown) => toast.show((err as Error).message, 'error'),
    })
  }

  const titleText = !isEdit ? 'New skill' : builtin ? `Edit built-in · ${skill?.title}` : 'Edit skill'

  return (
    <Modal title={titleText} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        {builtin && (
          <p className="muted small skill-builtin-note">
            Editing a built-in saves your own copy that overrides it. Use “Reset to built-in” any time to restore the default.
          </p>
        )}
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
        <div className="field">
          <span>
            <Wrench size={12} /> Allowed tools
          </span>
          <ToolPicker selected={tools} onChange={setTools} />
        </div>
        <label className="field skill-cap">
          <span>Max steps</span>
          <input className="input" type="number" min={1} max={20} value={cap} onChange={(e) => setCap(e.target.value)} />
        </label>
        <div className="form-actions skill-modal-actions">
          {isEdit && !builtin && (
            <button type="button" className="btn ghost danger" onClick={() => void removeOrReset()}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          {canReset && (
            <button type="button" className="btn ghost" onClick={() => void removeOrReset()}>
              <RotateCcw size={14} /> Reset to built-in
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
