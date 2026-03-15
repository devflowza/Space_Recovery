import React from 'react';
import { Info, AlertTriangle, Construction, Sparkles, Tag, X } from 'lucide-react';

interface AnnouncementPreviewProps {
  titleEn: string;
  titleAr?: string;
  contentEn: string;
  contentAr?: string;
  type: string;
  showAsBanner: boolean;
  isDismissible: boolean;
}

const typeConfig = {
  info: { icon: Info, color: 'bg-blue-500 text-white' },
  warning: { icon: AlertTriangle, color: 'bg-amber-500 text-white' },
  maintenance: { icon: Construction, color: 'bg-red-500 text-white' },
  feature: { icon: Sparkles, color: 'bg-green-500 text-white' },
  promotion: { icon: Tag, color: 'bg-purple-500 text-white' },
};

export const AnnouncementPreview: React.FC<AnnouncementPreviewProps> = ({
  titleEn,
  titleAr,
  contentEn,
  contentAr,
  type,
  showAsBanner,
  isDismissible,
}) => {
  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.info;
  const Icon = config.icon;

  if (showAsBanner) {
    return (
      <div className="space-y-4">
        <div className={`${config.color} rounded-lg p-4 flex items-start gap-3`}>
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold mb-1">{titleEn || 'Preview Title'}</h4>
            <p className="text-sm opacity-95">{contentEn || 'Preview content will appear here...'}</p>
          </div>
          {isDismissible && (
            <button className="flex-shrink-0 hover:opacity-75 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {titleAr && contentAr && (
          <div className={`${config.color} rounded-lg p-4 flex items-start gap-3 text-right`} dir="rtl">
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold mb-1">{titleAr}</h4>
              <p className="text-sm opacity-95">{contentAr}</p>
            </div>
            {isDismissible && (
              <button className="flex-shrink-0 hover:opacity-75 transition-opacity">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 rounded-lg p-6 bg-white">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              {titleEn || 'Preview Title'}
            </h4>
            <p className="text-sm text-slate-600">
              {contentEn || 'Preview content will appear here...'}
            </p>
          </div>
        </div>
      </div>

      {titleAr && contentAr && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white text-right" dir="rtl">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-slate-900 mb-2">{titleAr}</h4>
              <p className="text-sm text-slate-600">{contentAr}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
