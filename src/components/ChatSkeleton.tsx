import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* User message skeleton */}
      <div className="flex gap-3 p-4 rounded-2xl max-w-[85%] ml-auto bg-primary/10 animate-in slide-in-from-right-4 duration-500">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16 skeleton-shimmer" />
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-3/4 skeleton-shimmer" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 skeleton-shimmer" />
      </div>

      {/* Assistant message skeleton */}
      <div className="flex gap-3 p-4 rounded-2xl max-w-[85%] mr-auto bg-muted animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: "100ms" }}>
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20 skeleton-shimmer" />
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-2/3 skeleton-shimmer" />
        </div>
      </div>

      {/* Another user message */}
      <div className="flex gap-3 p-4 rounded-2xl max-w-[85%] ml-auto bg-primary/10 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: "200ms" }}>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16 skeleton-shimmer" />
          <Skeleton className="h-4 w-2/3 skeleton-shimmer" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 skeleton-shimmer" />
      </div>

      {/* Assistant response */}
      <div className="flex gap-3 p-4 rounded-2xl max-w-[85%] mr-auto bg-muted animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: "300ms" }}>
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20 skeleton-shimmer" />
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-4/5 skeleton-shimmer" />
          <Skeleton className="h-4 w-1/2 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
