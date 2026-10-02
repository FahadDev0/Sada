import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Check, Copy, Download, ExternalLink, MessageCircle } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import type { SurveyStatus } from '../lib/types'
import { Modal } from './Modal'

export function publicUrl(slug: string) {
  return `${window.location.origin}/s/${slug}`
}

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  title: string
  status: SurveyStatus
  onPublish?: () => void
}

export function ShareDialog({ open, onClose, slug, title, status, onPublish }: Props) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const canvasWrap = useRef<HTMLDivElement>(null)
  const url = publicUrl(slug)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQr = () => {
    const canvas = canvasWrap.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `sada-${slug}-qr.png`
    a.click()
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`

  return (
    <Modal open={open} onClose={onClose} title={t('share.title')}>
      {status !== 'PUBLISHED' && (
        <div className="mb-5 rounded-[var(--radius-field)] bg-saffron-soft px-4 py-3 text-sm text-saffron-dark">
          <p>{status === 'DRAFT' ? t('share.draftNote') : t('share.closedNote')}</p>
          {status === 'DRAFT' && onPublish && (
            <button type="button" className="btn btn-saffron mt-3 text-sm" onClick={onPublish}>
              {t('editor.publish')}
            </button>
          )}
        </div>
      )}

      <label className="label" htmlFor="share-url">
        {t('share.link')}
      </label>
      <div className="flex gap-2">
        <input
          id="share-url"
          readOnly
          dir="ltr"
          value={url}
          className="field min-w-0 flex-1 font-medium text-ink-soft"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="btn btn-primary shrink-0" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm">
          <ExternalLink size={16} />
          {t('share.open')}
        </a>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm">
          <MessageCircle size={16} />
          {t('share.whatsapp')}
        </a>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:gap-6">
        <div ref={canvasWrap} className="rounded-xl border border-line bg-white p-3">
          <QRCodeCanvas value={url} size={168} marginSize={1} level="M" fgColor="#10201d" />
        </div>
        <div className="text-center sm:text-start">
          <p className="font-medium">{t('share.qr')}</p>
          <button type="button" className="btn btn-secondary mt-3 text-sm" onClick={downloadQr}>
            <Download size={16} />
            {t('share.downloadQr')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
