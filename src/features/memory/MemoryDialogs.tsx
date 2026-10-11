import { Pencil, Trash } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { cx, fullDate } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import type { Memory, MemoryCategory } from '../../types'
import { categoryOrder, memoryCategories } from './categories'

export function sourceLabel(memory: Memory, threadTitle?: string) {
  switch (memory.source.type) {
    case 'user':
      return 'Added by you'
    case 'chat':
      return threadTitle ? `Learned in chat · ${threadTitle}` : 'Learned in a chat'
    case 'seed':
      return 'Demo sample'
  }
}

type Draft = Pick<Memory, 'category' | 'title' | 'detail' | 'tags'>

interface MemoryFormDialogProps {
  open: boolean
  onClose: () => void
  initial?: Memory
  onSubmit: (draft: Draft) => void
}

export function MemoryFormDialog({ open, onClose, initial, onSubmit }: MemoryFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit memory' : 'Add a memory'}
      description="Stored in this browser tab only. It won’t sync or survive a reload."
    >
      <MemoryForm key={initial?.id ?? 'new'} initial={initial} onCancel={onClose} onSubmit={onSubmit} />
    </Dialog>
  )
}

function MemoryForm({ initial, onCancel, onSubmit }: { initial?: Memory; onCancel: () => void; onSubmit: (d: Draft) => void }) {
  const id = useId()
  const [category, setCategory] = useState<MemoryCategory>(initial?.category ?? 'preference')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [detail, setDetail] = useState(initial?.detail ?? '')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [touched, setTouched] = useState(false)
  const titleError = title.trim().length === 0 ? 'Give the memory a short title.' : title.length > 80 ? 'Keep the title under 80 characters.' : ''
  const detailError = detail.length > 400 ? 'Keep details under 400 characters.' : ''

  return (
    <form
      className="stack-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (titleError || detailError) return
        onSubmit({
          category,
          title: title.trim(),
          detail: detail.trim(),
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 6),
        })
      }}
    >
      <fieldset className="field">
        <legend className="field__label">Type</legend>
        <div className="category-picker">
          {categoryOrder.map((c) => {
            const meta = memoryCategories[c]
            return (
              <label key={c} className={cx('category-option', category === c && 'is-selected')}>
                <input type="radio" name={`${id}-cat`} value={c} checked={category === c} onChange={() => setCategory(c)} />
                <meta.icon size={17} aria-hidden />
                <span>
                  <span className="category-option__label">{meta.label}</span>
                  <span className="category-option__hint">{meta.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-title`}>
          Title
        </label>
        <input
          id={`${id}-title`}
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Prefers trains over short flights"
          aria-invalid={touched && Boolean(titleError)}
          aria-describedby={touched && titleError ? `${id}-title-err` : undefined}
          autoFocus
        />
        {touched && titleError && (
          <p id={`${id}-title-err`} className="field__error">
            {titleError}
          </p>
        )}
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-detail`}>
          Details <span className="muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-detail`}
          className="textarea"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Anything that adds useful context"
          aria-invalid={Boolean(detailError)}
        />
        <p className={detailError ? 'field__error' : 'field__hint'}>{detailError || `${detail.length}/400`}</p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-tags`}>
          Tags <span className="muted">(comma separated)</span>
        </label>
        <input id={`${id}-tags`} className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="travel, food" />
      </div>

      <div className="row row--between form-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initial ? 'Save changes' : 'Add memory'}
        </Button>
      </div>
    </form>
  )
}

interface InspectDialogProps {
  memory: Memory | undefined
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function MemoryInspectDialog({ memory, onClose, onEdit, onDelete }: InspectDialogProps) {
  const { state } = useStore()
  const thread = memory?.source.type === 'chat' ? state.threads.find((t) => t.id === (memory.source as { threadId: string }).threadId) : undefined
  const meta = memory ? memoryCategories[memory.category] : undefined
  return (
    <Dialog
      open={Boolean(memory)}
      onClose={onClose}
      title={memory?.title ?? ''}
      footer={
        <>
          <Button variant="danger" icon={Trash} onClick={onDelete}>
            Delete
          </Button>
          <span className="spacer" />
          <Button variant="primary" icon={Pencil} onClick={onEdit}>
            Edit
          </Button>
        </>
      }
    >
      {memory && meta && (
        <div className="stack-4">
          <p className="memory-inspect__cat">
            <meta.icon size={16} aria-hidden /> {meta.label}
          </p>
          {memory.detail ? <p className="memory-inspect__detail">{memory.detail}</p> : <p className="muted">No extra details.</p>}
          {memory.tags.length > 0 && (
            <div className="row">
              {memory.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          <dl className="memory-inspect__meta">
            <div>
              <dt>Source</dt>
              <dd>{sourceLabel(memory, thread?.title)}</dd>
            </div>
            <div>
              <dt>Saved</dt>
              <dd>{fullDate(memory.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{fullDate(memory.updatedAt)}</dd>
            </div>
            <div>
              <dt>Stored</dt>
              <dd>This browser tab only</dd>
            </div>
          </dl>
        </div>
      )}
    </Dialog>
  )
}
