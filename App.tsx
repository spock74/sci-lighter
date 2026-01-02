
import React, { useState, useCallback, useMemo } from 'react';
import { AnnotationProject, TextAnnotation } from './types';
import Toolbar from './components/Toolbar';
import AnnotationCanvas from './components/AnnotationCanvas';
import Workbench from './components/Workbench';
import MainHeader from './components/MainHeader';
import SidebarHighlights from './components/SidebarHighlights';
import AnnotationList from './components/AnnotationList';
import LoginScreen from './components/LoginScreen';
import SelectionMenu from './components/SelectionMenu';
import AIInsightsPanel from './components/AIInsightsPanel';
import AnnotationEditModal from './components/AnnotationEditModal';
import { analyzeAnnotations } from './services/gemini';
import { broadcastUpdate } from './services/cloud';
import { clearProjectData } from './services/db';
import { useLanguage } from './LanguageContext';
import { useStore } from './store/useStore';
import { 
  Layers as LayersIcon, 
  LogOut
} from 'lucide-react';

// Hooks
import { useProjectInitialization } from './hooks/useProjectInitialization';
import { useSelectionListener } from './hooks/useSelectionListener';
import { useToolEffects } from './hooks/useToolEffects';

const App: React.FC = () => {
  const { t, locale } = useLanguage();
  
  // Zustand Store Selectors
  const currentUser = useStore(state => state.currentUser);
  const setCurrentUser = useStore(state => state.setCurrentUser);
  const project = useStore(state => state.project);
  const history = useStore(state => state.history);
  const setProject = useStore(state => state.setProject);
  const saveCurrentProject = useStore(state => state.saveCurrentProject);
  const activeTool = useStore(state => state.activeTool);
  const setActiveTool = useStore(state => state.setActiveTool);
  const currentColor = useStore(state => state.currentColor);
  const brushSize = useStore(state => state.brushSize);
  const isSidebarOpen = useStore(state => state.isSidebarOpen);
  const setSidebarOpen = useStore(state => state.setSidebarOpen);
  const isWorkbenchOpen = useStore(state => state.isWorkbenchOpen);
  const setWorkbenchOpen = useStore(state => state.setWorkbenchOpen);
  const selectedDrawingId = useStore(state => state.selectedDrawingId);
  const setSelectedDrawingId = useStore(state => state.setSelectedDrawingId);
  const isSyncing = useStore(state => state.isSyncing);
  const isAnalyzing = useStore(state => state.isAnalyzing);
  const setAnalyzing = useStore(state => state.setAnalyzing);
  const stagedAnnotationIds = useStore(state => state.stagedAnnotationIds);
  const pushToUndo = useStore(state => state.pushToUndo);
  const undo = useStore(state => state.undo);
  const redo = useStore(state => state.redo);
  const canUndo = useStore(state => state.undoStack.length > 0);
  const canRedo = useStore(state => state.redoStack.length > 0);
  const addTextAnnotation = useStore(state => state.addTextAnnotation);
  const updateTextAnnotation = useStore(state => state.updateTextAnnotation);
  const addSynapse = useStore(state => state.addSynapse);
  const stageAnnotation = useStore(state => state.stageAnnotation);
  const unstageAnnotation = useStore(state => state.unstageAnnotation);

  // Custom Hooks
  useProjectInitialization();
  useToolEffects();
  const { hasActiveSelection, pendingSelectionText, pendingSelectionRange, clearSelection } = useSelectionListener();



  const [editingAnnotation, setEditingAnnotation] = useState<TextAnnotation | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Listen for Highlight Clicks from Content Script
  React.useEffect(() => {
    const handleMessage = (request: any) => {
      if (request.action === 'HIGHLIGHT_CLICKED' && request.payload?.id) {
        const annotation = project.textAnnotations.find(a => a.id === request.payload.id);
        if (annotation) {
          setEditingAnnotation(annotation);
          setWorkbenchOpen(false); // Ensure we focus on the modal
        }
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [project.textAnnotations]);

  const handleDeleteTextAnnotation = useCallback((id: string) => {
    pushToUndo();
    setProject(prev => ({
      ...prev,
      textAnnotations: prev.textAnnotations.filter(a => a.id !== id)
    }));
  }, [pushToUndo, setProject]);

  const allAnnotationsGlobal = useMemo(() => {
    const others = history.flatMap(p => p.textAnnotations);
    const combined = [...project.textAnnotations, ...others];
    return Array.from(new Map(combined.map(item => [item.id, item])).values());
  }, [project.textAnnotations, history]);

  const stagedAnnotations = useMemo(() => {
    return allAnnotationsGlobal.filter(a => stagedAnnotationIds.includes(a.id));
  }, [allAnnotationsGlobal, stagedAnnotationIds]);

  const handleAnalyze = async () => {
    if (project.textAnnotations.length === 0) {
      alert(t('no_highlights'));
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeAnnotations(project, locale);
      setAiAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm(t('clear_all_confirm'))) {
      pushToUndo();
      setProject(prev => ({ 
        ...prev, 
        drawings: [], 
        textAnnotations: [], 
        synapses: [] 
      }));
      await clearProjectData(project.id);
      broadcastUpdate(project.id, { type: 'CLEAR' });
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className={`flex h-screen bg-page transition-colors duration-500 overflow-hidden`}>
      <aside className={`bg-sidebar border-r border-border-subtle transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden shadow-none border-none'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border-subtle flex items-center justify-between">
            <h1 className="text-xl font-bold text-main flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-pro">
                <LayersIcon size={18} />
              </div>
              {t('app_name')}
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="bg-gray-100/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-border-subtle shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <img src={currentUser.avatar} className="w-10 h-10 rounded-full ring-2 ring-primary/20" alt="" />
                <div>
                  <div className="font-bold text-main">{currentUser.name}</div>
                  <div className="text-[10px] text-primary font-bold uppercase tracking-wider">{t('pro_account')}</div>
                </div>
              </div>
              <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold uppercase tracking-tighter">
                <LogOut size={16} /> {t('sign_out')}
              </button>
            </div>

            <SidebarHighlights currentAnnotations={project.textAnnotations} globalAnnotations={allAnnotationsGlobal} onStage={(anno) => stageAnnotation(anno.id)} onTeleport={(anno) => alert(`${t('navigating_to')} ${anno.pageTitle}`)} onEdit={(anno) => setEditingAnnotation(anno)} />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <MainHeader url={project.url} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} isWorkbenchOpen={isWorkbenchOpen} onToggleWorkbench={() => setWorkbenchOpen(!isWorkbenchOpen)} onShare={() => alert(t('share_project'))} />

        <div className="flex-1 overflow-y-auto annotated-page-container relative bg-white">
          <div className="max-w-4xl mx-auto py-20 px-12 relative min-h-full">
            
            {/* Selection Action Card (Replaces Floating Menu) */}
            {hasActiveSelection && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="text-sm font-medium mb-3 text-blue-800 dark:text-blue-300">
                  {t('selected_text_label')}
                  <div className="italic opacity-80 mt-1 line-clamp-2">"{pendingSelectionText}"</div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { addTextAnnotation(pendingSelectionText, 'highlight', pendingSelectionRange); clearSelection(); }} 
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-md shadow-sm transition-colors text-xs uppercase tracking-wider"
                  >
                    {t('highlight_verb')}
                  </button>
                  <button 
                    onClick={() => { addTextAnnotation(pendingSelectionText, 'underline', pendingSelectionRange); clearSelection(); }}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold py-2 px-4 rounded-md shadow-sm transition-colors text-xs uppercase tracking-wider"
                  >
                    {t('underline_verb')}
                  </button>
                </div>
              </div>
            )}

            <AnnotationList annotations={project.textAnnotations} onEdit={setEditingAnnotation} onDelete={handleDeleteTextAnnotation} />
            <AnnotationCanvas drawings={project.drawings} textAnnotations={project.textAnnotations} layers={project.layers} activeLayerId={project.activeLayerId} selectedDrawingId={selectedDrawingId} onSelectDrawing={setSelectedDrawingId} onDrawingsChange={(newDrawings) => setProject(prev => ({ ...prev, drawings: newDrawings }))} onDeleteTextAnnotation={handleDeleteTextAnnotation} onUpdateTextAnnotation={updateTextAnnotation} activeTool={activeTool} currentColor={currentColor} brushSize={brushSize} />
          </div>
        </div>

        <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} currentColor={currentColor} setCurrentColor={(c) => useStore.setState({ currentColor: c })} brushSize={brushSize} setBrushSize={(s) => useStore.setState({ brushSize: s })} onClear={handleClearAll} onSave={saveCurrentProject} onAnalyze={handleAnalyze} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} isAnalyzing={isAnalyzing} isSyncing={isSyncing} />

        {aiAnalysisResult && <AIInsightsPanel result={aiAnalysisResult} onClose={() => setAiAnalysisResult(null)} />}
        {editingAnnotation && (
          <AnnotationEditModal 
            annotation={project.textAnnotations.find(a => a.id === editingAnnotation.id) || editingAnnotation} 
            onSave={(updates) => updateTextAnnotation(editingAnnotation.id, updates)} 
            onDelete={(id) => handleDeleteTextAnnotation(id)} 
            onClose={() => setEditingAnnotation(null)} 
          />
        )}
      </main>

      {isWorkbenchOpen && <Workbench stagedAnnotations={stagedAnnotations} allAnnotations={allAnnotationsGlobal} synapses={project.synapses} onUnstage={unstageAnnotation} onAddSynapse={addSynapse} onTeleport={(anno) => alert(`${t('navigating_to')} ${anno.pageTitle}`)} onClose={() => setWorkbenchOpen(false)} />}
    </div>
  );
};

export default App;
