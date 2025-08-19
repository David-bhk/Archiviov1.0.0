import { Suspense, lazy } from 'react';
import { FileText } from 'lucide-react';

// Lazy loading des composants lourds
const FileCard = lazy(() => import('./FileCard'));
const CompactFileCard = lazy(() => import('./CompactFileCard'));
const FileTable = lazy(() => import('./FileTable'));

// Composant de loading
const FileLoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-slate-200 rounded-lg h-48 flex items-center justify-center">
      <FileText className="w-8 h-8 text-slate-400" />
    </div>
  </div>
);

// Composant de loading pour table
const TableLoadingSkeleton = () => (
  <div className="animate-pulse space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-3 bg-slate-50 rounded">
        <div className="w-8 h-8 bg-slate-200 rounded"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="w-16 h-4 bg-slate-200 rounded"></div>
        <div className="w-20 h-4 bg-slate-200 rounded"></div>
      </div>
    ))}
  </div>
);

// Props pour les composants lazy
interface LazyFileComponentProps {
  files: any[];
  viewMode: 'cards' | 'compact' | 'table';
  onDownload?: (file: any) => void;
  onDelete?: (file: any) => void;
}

export function LazyFileGrid({ files, viewMode, onDownload, onDelete }: LazyFileComponentProps) {
  switch (viewMode) {
    case 'table':
      return (
        <Suspense fallback={<TableLoadingSkeleton />}>
          <FileTable 
            files={files} 
            onDownload={onDownload || (() => {})}
            onDelete={onDelete || (() => {})}
          />
        </Suspense>
      );
      
    case 'compact':
      return (
        <Suspense fallback={
          <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-200 rounded-lg h-32"></div>
            ))}
          </div>
        }>
          <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {files.map((file) => (
              <CompactFileCard key={file.id} file={file} />
            ))}
          </div>
        </Suspense>
      );
      
    case 'cards':
    default:
      return (
        <Suspense fallback={
          <div className="grid gap-3 lg:gap-4 xl:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <FileLoadingSkeleton key={i} />
            ))}
          </div>
        }>
          <div className="grid gap-3 lg:gap-4 xl:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </Suspense>
      );
  }
}
