import { useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useLanguage } from '../LanguageContext';
import { getActiveTab, getPageContent, injectContentScript, ensureContentConnection } from '../services/extension';
import { loadProjectsFromDB } from '../services/db';
import { sendToContentScript } from '../services/bridge';

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

    // Extracted init logic for reuse
    const initProject = useCallback(async (forceContentUpdate = false) => {
        if (!currentUser) return;
        
        const tab = await getActiveTab();
        if (!tab || !tab.id || !tab.url) {
            setProject(prev => ({ ...prev, title: t('no_active_tab'), content: t('no_active_tab_desc') }));
            return;
        }

        console.log("Sci-Lighter: Requesting content for tab", tab.id);
        let pageData = await getPageContent(tab.id, 1, true);

        if (!pageData) {
            console.log("Sci-Lighter: Content script not found, injecting...");
            await injectContentScript(tab.id);
            const isConnected = await ensureContentConnection(tab.id);
            if (isConnected) {
                pageData = await getPageContent(tab.id);
            } else {
                console.warn("Sci-Lighter: Content script failed to connect after injection");
            }
        }

        if (!pageData) {
            console.error("Sci-Lighter: Failed to get content after retry.");
            setProject(prev => ({ ...prev, title: tab.title || 'Unknown', url: tab.url || '', content: t('content_extraction_failed') }));
        } else {
            const projectId = btoa(pageData.url).slice(0, 32); 
            console.log(`Sci-Lighter: Calculated Project ID: ${projectId} for URL: ${pageData.url}`);
            
            // Reload projects from DB to ensure we have fresh data
            const projects = await loadProjectsFromDB(currentUser.id);
            setHistory(projects);
            const existing = projects.find(p => p.id === projectId);
            console.log("Sci-Lighter: Existing project found?", !!existing);

            if (existing) {
                // If we are re-initializing (e.g. reload), we should only update content if needed
                // But generally, we want to restore the project state to the UI
                loadProject(existing);
                setProject(prev => ({ ...prev, content: pageData?.content || prev.content }));
                
                if (existing.textAnnotations && existing.textAnnotations.length > 0) {
                    console.log("Sci-Lighter: Re-hydrating annotations (Batch)", existing.textAnnotations.length);
                    // Add delay to ensure DOM is ready
                    setTimeout(() => {
                        sendToContentScript(tab.id!, 'BATCH_CREATE_HIGHLIGHTS', existing.textAnnotations)
                            .catch(err => console.error("Sci-Lighter: Batch rehydration failed", err));
                    }, 500);
                }
            } else if (!forceContentUpdate) {
                // New project
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
    }, [currentUser, initialProject, loadProject, setHistory, setProject, t]);

    // Initial load
    useEffect(() => {
        initProject();
    }, [initProject]);

    // Listener for Tab Updates (Reloads)
    useEffect(() => {
        const handleTabUpdate = (tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => {
            // Check if updated tab is the active one and if loading is complete
            if (changeInfo.status === 'complete' && tab.active) {
                console.log("Sci-Lighter: Tab updated/reloaded, re-initializing...");
                initProject(true); // true = might be existing
            }
        };

        if (chrome.tabs && chrome.tabs.onUpdated) {
             chrome.tabs.onUpdated.addListener(handleTabUpdate);
             return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
        }
    }, [initProject]);

    // Sync Locale to Content Script
    const { locale } = useLanguage();
    useEffect(() => {
        const syncLocale = async () => {
            const tab = await getActiveTab();
            if (tab?.id) {
                // We use direct sendMessage here or import the bridge helper. 
                // Since we rely on services/extension helpers in this file, let's keep it simple.
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'SYNC_LOCALE', 
                    payload: { locale } 
                }).catch(() => {
                    // Content script might not be ready yet, which is fine.
                });
            }
        };
        syncLocale();
    }, [locale]);
};
