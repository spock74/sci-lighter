import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ToolType } from '../types';

export const useToolEffects = () => {
    const activeTool = useStore(state => state.activeTool);
    const setSelectedDrawingId = useStore(state => state.setSelectedDrawingId);

    useEffect(() => {
        if (activeTool !== ToolType.CURSOR) {
            setSelectedDrawingId(null);
        }
    }, [activeTool, setSelectedDrawingId]);
};
