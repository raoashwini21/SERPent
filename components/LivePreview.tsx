'use client';

import { ContentBrief } from '../lib/types';

interface SectionData {
  html: string;
  infographic: string | null;
}

interface LivePreviewProps {
  h1: string;
  sections: Record<string, SectionData>;
  brief: ContentBrief | null;
}

export default function LivePreview({ h1, sections, brief }: LivePreviewProps) {
  const orderedIds = brief ? brief.sections.map((s) => s.id) : Object.keys(sections);
  const hasContent = Object.keys(sections).length > 0;

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: '#F5F3FF' }}
          >
            <span style={{ color: '#6C5CE7' }}>✦</span>
          </div>
          <p className="text-sm">Content will appear here as it generates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-preview px-6 py-4 max-w-none">
      {h1 && <h1 className="mb-6">{h1}</h1>}

      {orderedIds.map((id) => {
        const data = sections[id];
        if (!data) return null;

        let combined = data.html;
        if (data.infographic) {
          // Inject infographic after first </p>
          const firstP = combined.indexOf('</p>');
          if (firstP !== -1) {
            combined =
              combined.slice(0, firstP + 4) +
              `\n${data.infographic}\n` +
              combined.slice(firstP + 4);
          } else {
            combined = combined + `\n${data.infographic}`;
          }
        }

        return (
          <div key={id} className="section-appear mb-2">
            <div dangerouslySetInnerHTML={{ __html: combined }} />
            <hr className="border-gray-100 my-4" />
          </div>
        );
      })}
    </div>
  );
}
