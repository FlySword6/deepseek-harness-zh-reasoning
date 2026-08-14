import { useEffect, useState } from 'react'

const SOURCE_LANGUAGE = 'en'
const TARGET_LANGUAGE = 'zh-Hans'
const CACHE_LIMIT = 200
const CJK_TEXT = /[\u3400-\u9fff]/
const LATIN_TEXT = /[A-Za-z]/

interface TranslationPair {
  sourceLanguage: string
  targetLanguage: string
}

interface BrowserTranslator {
  translate(text: string): Promise<string>
  destroy?(): void
}

interface BrowserTranslatorFactory {
  availability(options: TranslationPair): Promise<string>
  create(options: TranslationPair): Promise<BrowserTranslator>
}

interface BrowserTranslatorGlobal {
  Translator?: BrowserTranslatorFactory
}

let translatorPromise: Promise<BrowserTranslator | null> | undefined
const displayCache = new Map<string, string>()

function shouldTranslate(text: string): boolean {
  const trimmed = text.trim()
  return trimmed !== '' && LATIN_TEXT.test(trimmed) && !CJK_TEXT.test(trimmed)
}

async function loadTranslator(): Promise<BrowserTranslator | null> {
  if (translatorPromise !== undefined) return translatorPromise
  const factory = (globalThis as BrowserTranslatorGlobal).Translator
  if (factory === undefined) return null
  translatorPromise = (async () => {
    try {
      const options = { sourceLanguage: SOURCE_LANGUAGE, targetLanguage: TARGET_LANGUAGE }
      const availability = await factory.availability(options)
      if (availability === 'unavailable') return null
      return await factory.create(options)
    } catch (error) {
      void error
      return null
    }
  })()
  const translator = await translatorPromise
  if (translator === null) translatorPromise = undefined
  return translator
}

function remember(source: string, translated: string): void {
  displayCache.set(source, translated)
  while (displayCache.size > CACHE_LIMIT) {
    const oldest = displayCache.keys().next().value
    if (oldest === undefined) return
    displayCache.delete(oldest)
  }
}

async function translateForDisplay(text: string): Promise<string> {
  const cached = displayCache.get(text)
  if (cached !== undefined) return cached
  const translator = await loadTranslator()
  if (translator === null) return text
  try {
    const translated = await translator.translate(text)
    const display = translated.trim() === '' ? text : translated
    if (display !== text) remember(text, display)
    return display
  } catch (error) {
    void error
    return text
  }
}

/**
 * Return a Chinese-only display projection for reasoning text while preserving
 * the original assistant block for logs, replay, and model-visible history.
 * @param text - complete or streaming reasoning text.
 * @param running - whether the reasoning block is still streaming.
 * @returns the display text, falling back to the original when browser translation is unavailable.
 */
export function useChineseReasoningDisplay(text: string, running: boolean): string {
  const [displayText, setDisplayText] = useState(text)
  useEffect(() => {
    let cancelled = false
    if (!shouldTranslate(text)) {
      setDisplayText(text)
      return () => { cancelled = true }
    }
    const cached = displayCache.get(text)
    if (cached !== undefined) {
      setDisplayText(cached)
      return () => { cancelled = true }
    }
    setDisplayText(text)
    const timer = setTimeout(() => {
      void translateForDisplay(text).then((translated) => {
        if (!cancelled) setDisplayText(translated)
      })
    }, running ? 800 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [running, text])
  return displayText
}
