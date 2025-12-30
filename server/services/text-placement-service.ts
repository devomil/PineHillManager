export interface TextPlacement {
  sceneIndex: number;
  hasTextOverlay: boolean;
  placement: {
    position: 'top' | 'center' | 'bottom' | 'lower-third';
    alignment: 'left' | 'center' | 'right';
    safeZone: boolean;
  } | null;
  reason: string;
}

interface SceneForPlacement {
  sceneIndex: number;
  sceneType: string;
  contentType: string;
  hasText: boolean;
  textContent?: string;
  analysisResult?: {
    faceRegions?: Array<{ x: number; y: number; width: number; height: number }>;
    subjectPosition?: 'left' | 'center' | 'right';
    busyRegions?: string[];
  };
}

class TextPlacementService {
  
  async determineTextPlacements(scenes: SceneForPlacement[]): Promise<TextPlacement[]> {
    return scenes.map(scene => {
      if (!scene.hasText) {
        return {
          sceneIndex: scene.sceneIndex,
          hasTextOverlay: false,
          placement: null,
          reason: 'No text overlay needed',
        };
      }
      
      const placement = this.calculatePlacement(scene);
      
      return {
        sceneIndex: scene.sceneIndex,
        hasTextOverlay: true,
        placement,
        reason: this.getPlacementReason(scene, placement),
      };
    });
  }
  
  private calculatePlacement(scene: SceneForPlacement): TextPlacement['placement'] {
    const analysis = scene.analysisResult;
    
    if (analysis?.faceRegions?.length && analysis.faceRegions.length > 0) {
      const faceY = analysis.faceRegions[0].y;
      
      if (faceY < 0.5) {
        return {
          position: 'lower-third',
          alignment: 'center',
          safeZone: true,
        };
      }
      
      return {
        position: 'top',
        alignment: 'center',
        safeZone: true,
      };
    }
    
    if (analysis?.subjectPosition === 'left') {
      return {
        position: 'lower-third',
        alignment: 'right',
        safeZone: true,
      };
    }
    
    if (analysis?.subjectPosition === 'right') {
      return {
        position: 'lower-third',
        alignment: 'left',
        safeZone: true,
      };
    }
    
    return {
      position: 'lower-third',
      alignment: 'center',
      safeZone: true,
    };
  }
  
  private getPlacementReason(scene: SceneForPlacement, placement: TextPlacement['placement']): string {
    const analysis = scene.analysisResult;
    
    if (analysis?.faceRegions?.length && analysis.faceRegions.length > 0) {
      return `Avoiding face region - text at ${placement?.position}`;
    }
    
    if (analysis?.subjectPosition) {
      return `Subject ${analysis.subjectPosition} - text aligned ${placement?.alignment}`;
    }
    
    return 'Standard lower-third placement';
  }
}

export const textPlacementService = new TextPlacementService();
