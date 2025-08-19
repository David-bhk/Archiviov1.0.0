import { useState, useEffect, useMemo } from 'react';
import { ViewMode } from '../types';

interface UseFileOptimizationProps {
  totalFiles: number;
  currentViewMode: ViewMode;
}

interface UseFileOptimizationReturn {
  optimalViewMode: ViewMode;
  optimalPageSize: number;
  shouldAutoSwitch: boolean;
  performanceWarning: string | null;
  optimizationTips: string[];
}

export function useFileOptimization({ 
  totalFiles, 
  currentViewMode 
}: UseFileOptimizationProps): UseFileOptimizationReturn {
  
  // Calcul du mode de vue optimal
  const optimalViewMode = useMemo((): ViewMode => {
    if (totalFiles > 5000) return 'table';
    if (totalFiles > 1000) return 'compact';
    return 'cards';
  }, [totalFiles]);

  // Calcul de la pagination optimale
  const optimalPageSize = useMemo(() => {
    if (totalFiles > 10000) return 100;
    if (totalFiles > 5000) return 50;
    if (totalFiles > 1000) return 25;
    if (totalFiles > 200) return 15;
    return 12;
  }, [totalFiles]);

  // Détection si un changement automatique est recommandé
  const shouldAutoSwitch = useMemo(() => {
    if (totalFiles > 1000 && currentViewMode === 'cards') return true;
    if (totalFiles > 5000 && currentViewMode === 'compact') return true;
    return false;
  }, [totalFiles, currentViewMode]);

  // Messages d'avertissement performance
  const performanceWarning = useMemo(() => {
    if (totalFiles > 10000 && currentViewMode === 'cards') {
      return 'Avec plus de 10 000 fichiers, la vue cartes peut être lente. Utilisez la vue tableau pour de meilleures performances.';
    }
    if (totalFiles > 5000 && currentViewMode === 'cards') {
      return 'Avec plus de 5 000 fichiers, considérez utiliser la vue compacte ou tableau.';
    }
    return null;
  }, [totalFiles, currentViewMode]);

  // Conseils d'optimisation
  const optimizationTips = useMemo(() => {
    const tips: string[] = [];
    
    if (totalFiles > 1000) {
      tips.push('Utilisez les filtres pour réduire le nombre de résultats');
    }
    
    if (totalFiles > 5000) {
      tips.push('La recherche par mots-clés est plus efficace que le parcours');
      tips.push('Organisez vos fichiers par départements pour un accès plus rapide');
    }
    
    if (totalFiles > 10000) {
      tips.push('Considérez archiver les anciens fichiers pour améliorer les performances');
      tips.push('Utilisez la vue tableau pour parcourir rapidement de grandes quantités');
    }

    return tips;
  }, [totalFiles]);

  return {
    optimalViewMode,
    optimalPageSize,
    shouldAutoSwitch,
    performanceWarning,
    optimizationTips
  };
}
