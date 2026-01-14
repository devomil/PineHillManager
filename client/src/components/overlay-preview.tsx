import { useMemo } from 'react';
import type { OverlayConfig } from './overlay-editor';

interface OverlayPreviewProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  config: OverlayConfig;
  aspectRatio?: string;
  convertUrl?: (url: string) => string;
}

export function OverlayPreview({ 
  mediaUrl, 
  mediaType, 
  config,
  aspectRatio = '16/9',
  convertUrl = (url) => url
}: OverlayPreviewProps) {
  // Debug logging
  console.log('[OverlayPreview v3.0] Received config:', {
    logoEnabled: config.logo.enabled,
    logoUrl: config.logo.logoUrl?.substring(0, 50),
    logoPosition: config.logo.position,
    logoSize: config.logo.size,
  });
  
  // Compute logo position directly without useMemo to avoid caching issues
  const logoPosition = (() => {
    if (!config.logo.enabled || !config.logo.logoUrl) {
      console.log('[OverlayPreview v3.0] Logo not rendered - enabled:', config.logo.enabled, 'hasUrl:', !!config.logo.logoUrl);
      return null;
    }
    
    const pos = config.logo.position || 'center';
    const sizes: Record<string, string> = {
      'small': '10%',
      'medium': '15%',
      'large': '20%',
    };
    
    console.log('[OverlayPreview v3.0] Logo WILL render at position:', pos);
    
    return {
      pos,
      size: sizes[config.logo.size] || '15%',
    };
  })();
  
  const watermarkPosition = useMemo(() => {
    if (!config.watermark.enabled || !config.watermark.watermarkUrl) return null;
    
    const positions: Record<string, React.CSSProperties> = {
      'top-left': { top: '3%', left: '3%', right: 'auto', bottom: 'auto' },
      'top-center': { top: '3%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)' },
      'top-right': { top: '3%', right: '3%', left: 'auto', bottom: 'auto' },
      'bottom-left': { bottom: '3%', left: '3%', right: 'auto', top: 'auto' },
      'bottom-center': { bottom: '3%', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: '3%', right: '3%', left: 'auto', top: 'auto' },
    };
    
    return positions[config.watermark.position] || positions['bottom-right'];
  }, [config.watermark]);
  
  const textPositions: Record<string, React.CSSProperties> = {
    'top': { top: '10%', left: '50%', transform: 'translateX(-50%)' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'bottom': { bottom: '15%', left: '50%', transform: 'translateX(-50%)' },
  };
  
  const fontSizeMap: Record<number, string> = {
    24: '0.75rem',
    32: '1rem',
    42: '1.25rem',
    56: '1.5rem',
  };

  return (
    <div 
      className="relative w-full rounded-lg overflow-hidden border bg-black"
      style={{ aspectRatio }}
      data-testid="overlay-preview"
    >
      {mediaType === 'video' ? (
        <video 
          src={mediaUrl}
          className="w-full h-full object-contain"
          controls
          muted
          loop
        />
      ) : (
        <img 
          src={mediaUrl}
          alt="Scene preview"
          className="w-full h-full object-contain"
        />
      )}
      
      {config.texts.map((text, idx) => (
        <div
          key={text.id}
          className="absolute px-3 py-1 rounded text-white font-semibold text-shadow-lg"
          style={{
            ...textPositions[text.position],
            fontSize: fontSizeMap[text.fontSize] || '1rem',
            backgroundColor: 'rgba(45, 90, 39, 0.85)',
            maxWidth: '80%',
            textAlign: 'center',
            marginTop: idx * 40,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          data-testid={`preview-text-${idx}`}
        >
          {text.text}
        </div>
      ))}
      
      {logoPosition && config.logo.logoUrl && (() => {
        const positionStyles: Record<string, React.CSSProperties> = {
          'top-left': { position: 'absolute', top: '5%', left: '5%', right: 'auto', bottom: 'auto', transform: 'none' },
          'top-center': { position: 'absolute', top: '5%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)' },
          'top-right': { position: 'absolute', top: '5%', right: '5%', left: 'auto', bottom: 'auto', transform: 'none' },
          'center': { position: 'absolute', top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
          'bottom-left': { position: 'absolute', bottom: '15%', left: '5%', right: 'auto', top: 'auto', transform: 'none' },
          'bottom-center': { position: 'absolute', bottom: '15%', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)' },
          'bottom-right': { position: 'absolute', bottom: '15%', right: '5%', left: 'auto', top: 'auto', transform: 'none' },
        };
        const posStyle = positionStyles[logoPosition.pos] || positionStyles['center'];
        console.log('[OverlayPreview v3.2] Logo at:', logoPosition.pos, 'style:', JSON.stringify(posStyle));
        return (
          <div
            key={`logo-pos-${logoPosition.pos}-${Date.now()}`}
            style={{
              ...posStyle,
              width: 'fit-content',
              maxWidth: '25%',
              border: '3px solid #00ff00',
              backgroundColor: 'rgba(0,255,0,0.2)',
              padding: '4px',
              borderRadius: '4px',
              zIndex: 50,
            }}
            data-testid="preview-logo"
            data-position={logoPosition.pos}
          >
            <img 
              src={convertUrl(config.logo.logoUrl)}
              alt="Logo"
              style={{ width: logoPosition.size, minWidth: '60px', height: 'auto', maxHeight: '20%' }}
              className="object-contain drop-shadow-lg"
            />
            {config.logo.showTagline && (
              <div 
                className="text-white text-xs mt-1 font-medium drop-shadow-lg text-center"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                Cultivating Wellness
              </div>
            )}
          </div>
        );
      })()}
      
      {watermarkPosition && config.watermark.watermarkUrl && (
        <div
          style={{
            position: 'absolute',
            ...watermarkPosition,
            opacity: config.watermark.opacity / 100,
          }}
          data-testid="preview-watermark"
        >
          <img 
            src={convertUrl(config.watermark.watermarkUrl)}
            alt="Watermark"
            className="w-12 h-auto object-contain"
          />
        </div>
      )}
      
      {(config.additionalLogos || []).map((badge, idx) => {
        const badgePositions: Record<string, React.CSSProperties> = {
          'top-left': { position: 'absolute', top: '8%', left: '8%', right: 'auto', bottom: 'auto', transform: 'none' },
          'top-center': { position: 'absolute', top: '8%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)' },
          'top-right': { position: 'absolute', top: '8%', right: '8%', left: 'auto', bottom: 'auto', transform: 'none' },
          'bottom-left': { position: 'absolute', bottom: '18%', left: '8%', right: 'auto', top: 'auto', transform: 'none' },
          'bottom-center': { position: 'absolute', bottom: '18%', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)' },
          'bottom-right': { position: 'absolute', bottom: '18%', right: '8%', left: 'auto', top: 'auto', transform: 'none' },
        };
        const posStyle = badgePositions[badge.position] || badgePositions['bottom-left'];
        console.log('[OverlayPreview v3.2] Badge', idx, 'at:', badge.position);
        return (
          <div
            key={badge.id}
            style={{
              ...posStyle,
              width: 'fit-content',
              maxWidth: '15%',
              opacity: badge.opacity / 100,
              border: '2px solid #ff00ff',
              backgroundColor: 'rgba(255,0,255,0.15)',
              padding: '3px',
              borderRadius: '4px',
              zIndex: 49,
            }}
            data-testid={`preview-badge-${idx}`}
            data-position={badge.position}
          >
            <img 
              src={convertUrl(badge.logoUrl)}
              alt={badge.logoName}
              style={{ width: '40px', height: 'auto', minWidth: '30px' }}
              className="object-contain drop-shadow-md"
            />
          </div>
        );
      })}
      
      {config.lowerThirds.map((lt, idx) => (
        <div
          key={lt.id}
          className="absolute bottom-4"
          style={{
            [lt.position === 'left' ? 'left' : 'right']: '5%',
          }}
          data-testid={`preview-lowerthird-${idx}`}
        >
          <div className="bg-gradient-to-r from-[#2D5A27] to-[#3D7A33] px-4 py-2 rounded-lg shadow-lg">
            <div className="text-white font-bold text-sm">{lt.name}</div>
            <div className="text-white/80 text-xs">{lt.title}</div>
          </div>
        </div>
      ))}
      
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        Overlay Preview
      </div>
    </div>
  );
}
