import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useLanguage } from '../LanguageContext';
import { getActiveTab, getPageContent, injectContentScript, ensureContentConnection } from '../services/extension';
import { loadProjectsFromDB } from '../services/db';

export const useProjectInitialization = () => {
    const { t } = useLanguage();
    const currentUser = useStore(state => state.currentUser);
    const setProject = useStore(state => state.setProject);
    const setHistory = useStore(state => state.setHistory);
    const loadProject = useStore(state => state.loadProject);

    const initialProject = useMemo(() => ({
        id: 'current-page',
        title: t('loading_title'),
        url: '',
        content: t('loading_content'),
        drawings: [],
        textAnnotations: [],
        synapses: [],
        layers: [{ id: 'layer-default', name: `${t('layer_prefix')} 1`, visible: true, locked: false }],
        activeLayerId: 'layer-default',
        updatedAt: Date.now(),
        ownerId: currentUser?.id || 'anonymous',
        collaborators: []
    }), [t, currentUser]);

    useEffect(() => {
        if (!currentUser) return;

        const init = async () => {
            const tab = await getActiveTab();
            if (!tab || !tab.id || !tab.url) {
                setProject(prev => ({ ...prev, title: t('no_active_tab'), content: t('no_active_tab_desc') }));
                return;
            }

            console.log("WebMark Pro: Requesting content for tab", tab.id);
            let pageData = await getPageContent(tab.id, 1, true);

            if (!pageData) {
                console.log("WebMark Pro: Content script not found, injecting...");
                await injectContentScript(tab.id);
                const isConnected = await ensureContentConnection(tab.id);
                if (isConnected) {
                    pageData = await getPageContent(tab.id);
                } else {
                    console.warn("WebMark Pro: Content script failed to connect after injection");
                }
            }

            if (!pageData) {
                console.error("WebMark Pro: Failed to get content after retry.");
                setProject(prev => ({ ...prev, title: tab.title || 'Unknown', url: tab.url || '', content: t('content_extraction_failed') }));
            } else {
                const projectId = btoa(pageData.url).slice(0, 32); 
                const projects = await loadProjectsFromDB(currentUser.id);
                setHistory(projects);
                const existing = projects.find(p => p.id === projectId);

                if (existing) {
                    loadProject(existing);
                    setProject(prev => ({ ...prev, content: pageData?.content || prev.content })); 
                } else {
                    setProject({
                        ...initialProject,
                        id: projectId,
                        title: pageData.title,
                        url: pageData.url,
                        content: pageData.content,
                        drawings: [],
                        textAnnotations: [],
                    });
                }
            }
        };
        
        init();
    }, [currentUser, initialProject, loadProject, setHistory, setProject, t]);

    // Sync Locale to Content Script
    const { locale } = useLanguage();
    useEffect(() => {
        const syncLocale = async () => {
            const tab = await getActiveTab();
            if (tab?.id) {
                // We use direct sendMessage here or import the bridge helper. 
                // Since we rely on services/extension helpers in this file, let's keep it simple.
                // But wait, we want type safety.
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'SYNC_LOCALE', 
                    payload: { locale } 
                }).catch(() => {
                    // Content script might not be ready yet, which is fine.
                    // The init() effect handles the first injection.
                });
            }
        };
        syncLocale();
    }, [locale]);
};
