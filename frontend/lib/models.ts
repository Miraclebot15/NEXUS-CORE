/**
 * NEXUS CORE :: lib/models.ts
 *
 * Single source of truth for the model picker, previously duplicated
 * separately inside top-bar.tsx and composer.tsx.
 *
 * IMPORTANT: this list is currently cosmetic. The backend runs whichever
 * single model is configured via QWEN_MODEL in its own .env (see
 * nexus-core/config.py) -- it does not yet accept a per-request model
 * override. Selecting a different entry here will not change which model
 * actually answers until the backend adds that parameter to
 * `/api/task/stream`. Kept visible (rather than removed) because the
 * multi-model picker is part of the intended product surface -- just flag
 * this gap to whoever wires up that backend parameter next.
 */

export interface QwenModelOption {
  id: string
  label: string
  description: string
}

export const QWEN_MODELS: QwenModelOption[] = [
  { id: 'qwen-max', label: 'Qwen Max', description: 'Enterprise tier' },
  { id: 'qwen-plus', label: 'Qwen Plus', description: 'Advanced reasoning' },
  { id: 'qwen-turbo', label: 'Qwen Turbo', description: 'Balanced performance (backend default)' },
  { id: 'qwen-long', label: 'Qwen Long', description: 'Extended context' },
]

export const DEFAULT_MODEL_ID = 'qwen-turbo'
