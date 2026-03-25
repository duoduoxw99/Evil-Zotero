import { TopMenuBar } from './TopMenuBar'
import { TabBar } from './TabBar'
import { SidebarCollections } from './SidebarCollections'
import { PaperTable } from './PaperTable'
import { RightToolbar } from './RightToolbar'
import { TagPanel } from './TagPanel'
import { FloatingSpicyButton } from './FloatingSpicyButton'
import { BottomSpicyPanel } from './BottomSpicyPanel'
import { ReaderLayout } from './ReaderLayout'
import { MOCK_PAPERS } from '@/data/mockPapers'
import type { Paper } from '@/types'
import type { CollectionId } from '@/data/mockPapers'
import { useMemo, useState } from 'react'

export function AppShell() {
  const [viewMode, setViewMode] = useState<'library' | 'reader'>('library')
  const [agentMode, setAgentMode] = useState<'angel' | 'devil'>('angel')
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<CollectionId>('All')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [spicyPanelOpen, setSpicyPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('My Library')

  const filteredPapers = useMemo(() => {
    let list = MOCK_PAPERS.filter(
      (p) => selectedCollection === 'All' || p.collection === selectedCollection,
    )
    if (selectedTags.length > 0) {
      list = list.filter((p) => selectedTags.some((t) => p.tags.includes(t)))
    }
    return list
  }, [selectedCollection, selectedTags])

  const openPaper = (id: string) => {
    setSelectedPaperId(id)
    setViewMode('reader')
    setActiveTab(MOCK_PAPERS.find((p) => p.id === id)?.title ?? id)
  }

  const closeReader = () => {
    setViewMode('library')
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const currentPaper: Paper | null =
    viewMode === 'reader' && selectedPaperId
      ? MOCK_PAPERS.find((p) => p.id === selectedPaperId) ?? null
      : null

  const tabs = useMemo(() => {
    const t = ['My Library']
    if (currentPaper) t.push(currentPaper.title.slice(0, 24) + '…')
    return t
  }, [currentPaper])

  return (
    <div
      data-agent-mode={agentMode}
      className="app-shell flex h-full flex-col bg-zotero-bg text-zotero-text"
    >
      <TopMenuBar />
      <TabBar
        activeTab={activeTab}
        tabs={tabs}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          if (tab !== 'My Library') setViewMode('reader')
          else setViewMode('library')
        }}
      />
      {viewMode === 'library' ? (
        <>
          <div className="flex flex-1 overflow-hidden">
            <SidebarCollections
              selectedCollection={selectedCollection}
              onSelectCollection={setSelectedCollection}
            />
            <div className="flex flex-1 flex-col overflow-hidden">
              <PaperTable
                papers={filteredPapers}
                selectedPaperId={selectedPaperId}
                onSelectPaper={setSelectedPaperId}
                onOpenPaper={openPaper}
              />
            </div>
            <RightToolbar />
          </div>
          <TagPanel
            papers={filteredPapers}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
          />
          <BottomSpicyPanel isOpen={spicyPanelOpen} />
          <FloatingSpicyButton
            mode={agentMode}
            onToggleMode={() =>
              setAgentMode((m) => (m === 'angel' ? 'devil' : 'angel'))
            }
            isPanelOpen={spicyPanelOpen}
          />
        </>
      ) : (
        currentPaper && (
          <>
            <ReaderLayout
              paper={currentPaper}
              onClose={closeReader}
              spicyOpen={spicyPanelOpen}
              mode={agentMode}
              onModeChange={setAgentMode}
            />
            <FloatingSpicyButton
              mode={agentMode}
              onToggleMode={() => {
                setAgentMode((m) => (m === 'angel' ? 'devil' : 'angel'))
                setSpicyPanelOpen(true)
              }}
              isPanelOpen={spicyPanelOpen}
            />
          </>
        )
      )}
    </div>
  )
}
