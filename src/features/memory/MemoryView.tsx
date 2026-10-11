import { Brain, CircleAlert, Lock, Plus, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { hrefFor, type View } from '../../lib/useRoute'
import { relativeTime } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import type { Memory, MemoryCategory } from '../../types'
import { categoryOrder, memoryCategories } from './categories'
import { MemoryFormDialog, MemoryInspectDialog, sourceLabel } from './MemoryDialogs'
import './memory.css'

type Filter = 'all' | MemoryCategory

export function MemoryView({ memoryId, navigate }: { memoryId?: string; navigate: (view: View, param?: string) => void }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [inspectId, setInspectId] = useState<string | undefined>(memoryId)
  const [editing, setEditing] = useState<Memory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Memory | null>(null)
  const { companionName, memoryCapture } = state.settings

  useEffect(() => setInspectId(memoryId), [memoryId])

  const inspected = state.memories.find((m) => m.id === inspectId)
  const closeInspect = () => {
    setInspectId(undefined)
    if (memoryId) navigate('memory')
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.memories]
      .filter((m) => filter === 'all' || m.category === filter)
      .filter((m) => !q || `${m.title} ${m.detail} ${m.tags.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [state.memories, filter, query])

  const threadTitle = (m: Memory) => (m.source.type === 'chat' ? state.threads.find((t) => t.id === (m.source as { threadId: string }).threadId)?.title : undefined)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Memory</h1>
          <p>What {companionName} keeps in mind about you. You decide what stays — edit or delete anything.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
          Add memory
        </Button>
      </header>

      <div className="stack-3 memory-notices">
        <p className="notice">
          <Lock size={16} aria-hidden />
          <span>
            <strong>Demo memories stay in this tab.</strong> They aren’t sent to a server, don’t sync across devices, and reset when you reload.
          </span>
        </p>
        {!memoryCapture && (
          <p className="notice notice--warning">
            <CircleAlert size={16} aria-hidden />
            <span>
              <strong>Saving from chat is off.</strong> {companionName} won’t add new memories from conversations. <a href={hrefFor('settings')}>Change in Settings</a>
            </span>
          </p>
        )}
      </div>

      {state.memories.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Brain}
            title="Nothing remembered yet"
            action={
              <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                Add your first memory
              </Button>
            }
          >
            Memories help {companionName} stay personal. Add one here, or say “remember that…” in chat.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="memory-toolbar">
            <div className="segmented" role="group" aria-label="Filter by type">
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All <span className="count">{state.memories.length}</span>
              </button>
              {categoryOrder.map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}>
                  {memoryCategories[c].plural} <span className="count">{state.memories.filter((m) => m.category === c).length}</span>
                </button>
              ))}
            </div>
            <div className="input-icon memory-search">
              <Search size={16} aria-hidden />
              <input className="input" type="search" placeholder="Search memories" aria-label="Search memories" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={SearchX}
                title="No memories match"
                compact
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      setFilter('all')
                    }}
                  >
                    Clear search and filters
                  </Button>
                }
              >
                Try a different word or type.
              </EmptyState>
            </div>
          ) : (
            <ul className="memory-grid" aria-label="Memories">
              {visible.map((m) => {
                const meta = memoryCategories[m.category]
                return (
                  <li key={m.id}>
                    <button type="button" className="memory-card card card--interactive" data-category={m.category} onClick={() => setInspectId(m.id)}>
                      <span className="memory-card__cat">
                        <meta.icon size={15} aria-hidden /> {meta.label}
                      </span>
                      <span className="memory-card__title">{m.title}</span>
                      {m.detail && <span className="memory-card__detail">{m.detail}</span>}
                      {m.tags.length > 0 && (
                        <span className="memory-card__tags">
                          {m.tags.map((t) => (
                            <span key={t} className="tag">
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="meta memory-card__meta">
                        <span>{sourceLabel(m, threadTitle(m))}</span>
                        <span>Updated {relativeTime(m.updatedAt)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <MemoryInspectDialog
        memory={editing || deleting ? undefined : inspected}
        onClose={closeInspect}
        onEdit={() => inspected && setEditing(inspected)}
        onDelete={() => inspected && setDeleting(inspected)}
      />

      <MemoryFormDialog
        open={editing !== null}
        initial={editing === 'new' || editing === null ? undefined : editing}
        onClose={() => setEditing(null)}
        onSubmit={(draft) => {
          if (editing === 'new') {
            actions.addMemory(draft)
            toast({ tone: 'success', title: 'Memory added', body: 'Saved in this tab only.' })
          } else if (editing) {
            actions.updateMemory(editing.id, draft)
            toast({ tone: 'success', title: 'Memory updated' })
          }
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this memory?"
        confirmLabel="Delete memory"
        onConfirm={() => {
          if (!deleting) return
          actions.deleteMemory(deleting.id)
          closeInspect()
          toast({ tone: 'info', title: 'Memory deleted', body: `${companionName} will no longer use “${deleting.title}”.` })
        }}
      >
        <p>
          “{deleting?.title}” will be removed straight away. {companionName} won’t use it again, and this can’t be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
