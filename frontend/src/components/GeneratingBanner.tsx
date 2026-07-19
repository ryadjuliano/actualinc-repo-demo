export function GeneratingBanner() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <div className="h-8 w-8 flex-shrink-0 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <div>
        <p className="font-medium text-brand-700">Generating your interior concept...</p>
        <p className="text-sm text-brand-600">AI image generation usually takes between 10 and 30 seconds.</p>
      </div>
    </div>
  );
}
