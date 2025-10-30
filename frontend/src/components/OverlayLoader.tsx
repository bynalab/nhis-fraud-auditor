type Props = {
  show: boolean;
  label?: string;
};

export default function OverlayLoader({ show, label }: Props) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm text-gray-700 dark:text-gray-200">
          {label || "Loading..."}
        </span>
      </div>
    </div>
  );
}
