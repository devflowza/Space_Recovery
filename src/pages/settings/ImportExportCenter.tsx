import { SettingsPageHeader } from '../../components/layout/SettingsPageHeader';

export function ImportExportCenter() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader categoryId="import-export" />
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-secondary-foreground">
          The new data-migration engine is being installed. Import and export
          wizards will appear here.
        </p>
      </div>
    </div>
  );
}
