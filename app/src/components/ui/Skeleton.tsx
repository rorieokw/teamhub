interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-700 rounded ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function SkeletonProjectCard() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonTaskCard() {
  return (
    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="flex gap-3 py-2 px-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonDocument() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  );
}

export function SkeletonDashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="w-12 h-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
