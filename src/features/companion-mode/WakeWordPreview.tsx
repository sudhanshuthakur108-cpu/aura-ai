import { MicOff, X } from 'lucide-react'
import { useId } from 'react'
import { Companion } from '../../components/companion/Companion'
import { IconButton } from '../../components/ui/Button'
import { useStore } from '../../state/AppStore'
import { cx } from '../../lib/utils'
import './companion-mode.css'

/* Explains the planned wake-word feature with a static mockup. Nothing here
   listens, records, detects a wake word or plays audio — it is sample UI. The
   name in the sample greeting is illustrative and isn't used elsewhere. */

export function WakeWordPreview({ onDismiss, className }: { onDismiss?: () => void; className?: string }) {
  const id = useId()
  const { state } = useStore()
  const { companionStyle } = state.settings
  return (
    <section className={cx('wake', className)} aria-labelledby={`${id}-title`}>
      <header className="wake__head">
        <p id={`${id}-title`} className="wake__eyebrow">
          Coming later · Voice mode
        </p>
        {onDismiss && <IconButton icon={X} label="Dismiss voice mode preview" size="sm" onClick={onDismiss} />}
      </header>
      <p className="wake__text">When voice mode is available, you’ll be able to call ‘Aura’ to start a conversation.</p>
      <figure className="wake__mock" aria-label="Sample of the planned greeting">
        <p className="wake__call">
          <span className="wake__who">You</span> “Aura?”
        </p>
        <div className="wake__reply">
          <Companion mood="idle" appearance={companionStyle} name="Aura" size="sm" animate={false} />
          <p>
            <strong>Aura:</strong> Hello Sudhanshu, how are you doing?
          </p>
        </div>
        <figcaption className="wake__caption">
          <MicOff size={13} aria-hidden /> Sample only — voice and wake word aren’t connected. Your microphone is never used.
        </figcaption>
      </figure>
    </section>
  )
}
