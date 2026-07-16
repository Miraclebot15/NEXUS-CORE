import { useState, useEffect } from 'react'
import * as api from './api-client'

export function useProjectArtifacts(projectId: string, getToken?: () => Promise<string>) {
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.listProjectArtifacts(projectId, getToken).then((data) => {
      if (!cancelled) {
        setArtifacts(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [projectId])

  return { artifacts, loading }
}
