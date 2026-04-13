'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from "@/lib/supabase/client"
import { EditorialeBoard } from "@/components/ui/editoriale-board"
import { IdeaBoard } from "@/components/ui/idea-board"
import { DesignWindow } from "@/components/ui/design-window"
import { LancioEditor } from "@/components/ui/lancio-editor"
import { StudioHeader } from "@/components/ui/studio-header"
import { useSearchParams, useRouter } from 'next/navigation'
import { useApp } from '@/components/layout/AppContext'

function StudioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'editoriale'

  const { clients, selectedClientId, setSelectedClientId, loading } = useApp()
  const [ideas, setIdeas] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({})

  // Context passing (from link to launch/design)
  const [initialContext, setInitialContext] = useState<any>(null)

  useEffect(() => {
    async function init() {
      try {
        // Fetch Posts
        const resPosts = await fetch('/api/editoriale')
        const { posts: allPosts } = await resPosts.json()
        setPosts(allPosts)

        // Fetch Ideas
        const supabase = createClient()
        const { data: ideaData } = await supabase.from('ideas').select('*, clients(name)')
        setIdeas(ideaData || [])
      } catch (err) {
        console.error('Failed to init Studio Boards:', err)
      }
    }
    init()
  }, [])

  const selectedClient = clients.find(c => c.id === selectedClientId)

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#090909]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      
      {/* Header Studio (Local Tab Switcher, Global Client Sync) */}
      <StudioHeader 
        clients={clients} 
        selectedClientId={selectedClientId} 
        onSelectClient={setSelectedClientId} 
        activeTab={activeTab}
      />

      <div className="flex-1 min-h-0 overflow-hidden px-4 py-4">
        
        {/* Main Content Area */}
        <main className="h-full w-full">
          
          {activeTab === 'editoriale' && (
            <EditorialeBoard 
              clients={clients} 
              initialPosts={posts} 
              initialMetrics={metrics}
              globalClientId={selectedClientId}
              onNavigate={(tab, context) => {
                setInitialContext(context)
                const params = new URLSearchParams(searchParams)
                params.set('tab', tab)
                router.push(`/studio?${params.toString()}`)
              }}
            />
          )}
          
          {activeTab === 'pubblica' && (
            <LancioEditor 
              defaultTo="" 
              defaultName="" 
              defaultSubject="" 
              replyMessage={null} 
              client={selectedClient || null}
              initialContent={initialContext?.content}
            />
          )}

          {activeTab === 'idee' && (
            <div className="h-full overflow-y-auto scrollbar-hide">
              <IdeaBoard ideas={ideas} />
            </div>
          )}

          {activeTab === 'progettazione' && (
            <div className="h-full overflow-hidden">
              <DesignWindow clients={clients} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  )
}
