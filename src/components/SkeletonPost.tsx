export default function SkeletonPost() {
  return (
    <div className="mb-2 space-y-3 bg-white p-4 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-2.5 w-1/4" />
        </div>
      </div>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}
