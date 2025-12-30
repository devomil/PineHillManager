import { useState } from 'react';
import { GripVertical, ChevronDown, ChevronUp, Clock, Video, Volume2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentTypeSelector, ContentType, getContentTypeIcon } from './content-type-selector';
import { VisualDirectionEditor } from './visual-direction-editor';

interface SceneSoundDesign {
  ambient: { type: string; description: string } | null;
  transition: { type: string; duration: number; description: string } | null;
  accents: string[];
}

interface Scene {
  id: string;
  type: string;
  narration: string;
  duration: number;
  contentType?: ContentType;
  visualDirection?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status?: 'pending' | 'generating' | 'complete' | 'error';
  soundDesign?: SceneSoundDesign;
}

interface SceneCardProps {
  scene: Scene;
  index: number;
  onUpdate: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  onDragStart?: () => void;
  expanded?: boolean;
  disabled?: boolean;
}

const SCENE_TYPE_COLORS: Record<string, string> = {
  hook: 'bg-purple-100 text-purple-800',
  problem: 'bg-red-100 text-red-800',
  solution: 'bg-green-100 text-green-800',
  benefit: 'bg-blue-100 text-blue-800',
  testimonial: 'bg-yellow-100 text-yellow-800',
  cta: 'bg-orange-100 text-orange-800',
  process: 'bg-indigo-100 text-indigo-800',
  story: 'bg-pink-100 text-pink-800',
};

export function SceneCard({
  scene,
  index,
  onUpdate,
  onDragStart,
  expanded: defaultExpanded = false,
  disabled = false,
}: SceneCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleContentTypeChange = async (contentType: ContentType) => {
    await onUpdate(scene.id, { contentType });
  };

  const handleVisualDirectionSave = async (visualDirection: string) => {
    await onUpdate(scene.id, { visualDirection });
  };

  const typeColor = SCENE_TYPE_COLORS[scene.type] || 'bg-gray-100 text-gray-800';

  return (
    <Card className={`transition-all ${disabled ? 'opacity-60' : ''}`} data-testid={`scene-card-${scene.id}`}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          <div
            className="cursor-grab text-gray-400 hover:text-gray-600"
            onMouseDown={onDragStart}
            data-testid="drag-handle"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="h-12 w-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
            {scene.thumbnailUrl ? (
              <img
                src={scene.thumbnailUrl}
                alt={`Scene ${index + 1}`}
                className="h-full w-full object-cover"
                data-testid="scene-thumbnail"
              />
            ) : (
              <Video className="h-5 w-5 text-gray-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={`text-xs ${typeColor}`} data-testid="badge-scene-type">
                {scene.type.charAt(0).toUpperCase() + scene.type.slice(1)}
              </Badge>

              <span className="text-xs text-gray-500 flex items-center gap-1" data-testid="scene-duration">
                <Clock className="h-3 w-3" />
                {scene.duration}s
              </span>

              <span className="text-xs text-gray-400 flex items-center gap-1" data-testid="content-type-icon">
                {getContentTypeIcon(scene.contentType || 'lifestyle')}
              </span>
            </div>

            <p className="text-sm text-gray-700 line-clamp-1" data-testid="scene-narration-preview">
              {scene.narration}
            </p>
          </div>

          <ContentTypeSelector
            value={scene.contentType || 'lifestyle'}
            onChange={handleContentTypeChange}
            compact
            disabled={disabled}
          />

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            data-testid="button-expand-scene"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 pt-0 space-y-3 border-t border-gray-100 mt-1" data-testid="scene-expanded-content">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Narration
              </label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-2" data-testid="scene-narration-full">
                {scene.narration}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Content Type
              </label>
              <ContentTypeSelector
                value={scene.contentType || 'lifestyle'}
                onChange={handleContentTypeChange}
                disabled={disabled}
              />
              <p className="text-xs text-gray-400 mt-1">
                Affects AI provider selection and prompt enhancement
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Visual Direction
              </label>
              <VisualDirectionEditor
                sceneId={scene.id}
                currentDirection={scene.visualDirection || ''}
                narration={scene.narration}
                sceneType={scene.type}
                onSave={handleVisualDirectionSave}
                disabled={disabled}
              />
            </div>

            {/* Sound Design (Phase 7C) */}
            {scene.soundDesign && (
              <div className="mt-3 pt-3 border-t border-gray-100" data-testid="scene-sound-design">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                  <Volume2 className="h-3 w-3" />
                  Sound Design
                </label>
                <div className="flex flex-wrap gap-2">
                  {scene.soundDesign.ambient && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-ambient">
                      🔊 {scene.soundDesign.ambient.type}
                    </Badge>
                  )}
                  {scene.soundDesign.transition && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-transition">
                      ↔️ {scene.soundDesign.transition.type} ({scene.soundDesign.transition.duration}s)
                    </Badge>
                  )}
                  {scene.soundDesign.accents?.map((accent, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-accent-${idx}`}>
                      ✨ {accent}
                    </Badge>
                  ))}
                  {!scene.soundDesign.ambient && !scene.soundDesign.transition && (!scene.soundDesign.accents || scene.soundDesign.accents.length === 0) && (
                    <span className="text-xs text-gray-400">No sound effects</span>
                  )}
                </div>
              </div>
            )}

            {scene.status && (
              <div className="flex items-center gap-2 text-xs" data-testid="scene-status">
                <span className="text-gray-500">Status:</span>
                {scene.status === 'pending' && (
                  <Badge variant="outline">Pending</Badge>
                )}
                {scene.status === 'generating' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Generating...
                  </Badge>
                )}
                {scene.status === 'complete' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Complete
                  </Badge>
                )}
                {scene.status === 'error' && (
                  <Badge variant="destructive">Error</Badge>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SceneCard;
