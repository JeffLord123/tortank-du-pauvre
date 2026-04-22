import { useState, useRef, useEffect } from 'react';
import { Settings, Plus, Trash2, X, Upload, Download, Sliders, MapPin, Gauge, ArrowLeftRight, Image, Lock, ChevronUp, ChevronDown, History, RotateCcw } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { useProfileStore, getActiveProfile } from '../store/profileStore';
import { useHistoryStore } from '../store/historyStore';
import { LEVER_TYPES, LEVER_CONFIGS } from '../data/defaults';
import type { LeverType, AdminTab, Preset } from '../types';
import { PlainNumericInput } from './NumInput';
import LeverLogoBadge from './LeverLogoBadge';

const TABS: { id: AdminTab; label: string; icon: typeof Settings }[] = [
  { id: 'params', label: 'Paramètres', icon: Settings },
  { id: 'presets', label: 'Presets', icon: Sliders },
  { id: 'levers', label: 'Leviers', icon: Gauge },
  { id: 'stores', label: 'Magasins', icon: MapPin },
  { id: 'importexport', label: 'Import / Export', icon: ArrowLeftRight },
  { id: 'history', label: 'Historique', icon: History },
];

function PresetRow({
  preset,
  leverConfigs,
  onRemove,
  readOnly,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  preset: Preset;
  leverConfigs: Record<string, { color?: string }>;
  onRemove: () => void;
  readOnly: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="glass-card p-4 flex items-start gap-3">
      {onMoveUp !== undefined && (
        <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded text-fg/40 hover:text-fg/88 hover:bg-fg/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded text-fg/40 hover:text-fg/88 hover:bg-fg/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{preset.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-700 text-fg/72">
            {preset.levers.length} leviers
          </span>
          {readOnly && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fg/8 text-fg/55 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Admin
            </span>
          )}
        </div>
        <p className="text-xs text-fg/60 mt-1">{preset.description}</p>
        <div className="flex items-center gap-2 mt-2">
          {preset.levers.map((l, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${leverConfigs[l.type]?.color}20` }}
              title={l.type}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: leverConfigs[l.type]?.color }} />
            </div>
          ))}
        </div>
      </div>
      {!readOnly && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const profiles = useProfileStore(s => s.profiles);
  const activeProfileId = useProfileStore(s => s.activeProfileId);
  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const isAdminUser = activeProfile?.isAdmin ?? true;

  const {
    presets, removePreset, reorderAdminPresets, showAdmin, toggleAdmin,
    leverConfigs, updateLeverConfig,
    stores, addStore, removeStore, updateStore, importStoresFromExcel,
    globalParams, updateGlobalParams,
    exportData, importData,
  } = useSimulationStore();

  const [tab, setTab] = useState<AdminTab>(() => (isAdminUser ? 'params' : 'presets'));

  useEffect(() => {
    if (showAdmin && !isAdminUser) setTab('presets');
  }, [showAdmin, isAdminUser]);

  const adminPresetsList = presets.filter(p => (p.scope ?? 'admin') === 'admin');
  const myPresetsList = presets.filter(
    p => p.scope === 'user' && p.ownerProfileId === activeProfileId,
  );

  const removeCtx = {
    isAdmin: isAdminUser,
    profileId: activeProfileId ?? null,
  };

  const moveAdminPreset = (index: number, direction: -1 | 1) => {
    const newList = [...adminPresetsList];
    const target = index + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    reorderAdminPresets(newList.map(p => p.id));
  };
  const [newStoreName, setNewStoreName] = useState('');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelStatus, setExcelStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const leverLogoInputRef = useRef<HTMLInputElement>(null);
  const leverLogoTargetRef = useRef<LeverType | null>(null);

  if (!showAdmin) return null;

  const openLeverLogoPicker = (type: LeverType) => {
    leverLogoTargetRef.current = type;
    leverLogoInputRef.current?.click();
  };

  const onLeverLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = leverLogoTargetRef.current;
    const file = e.target.files?.[0];
    e.target.value = '';
    leverLogoTargetRef.current = null;
    if (!type || !file || !file.type.startsWith('image/')) return;
    if (file.size > 2.5 * 1024 * 1024) {
      window.alert('Image trop volumineuse (max. ~2,5 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateLeverConfig(type, { logoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lmp-simulation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (json: string) => {
    const ok = importData(json);
    setImportStatus(ok ? 'success' : 'error');
    if (ok) setImportText('');
    setTimeout(() => setImportStatus('idle'), 3000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleImport(reader.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'replace' | 'append') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setExcelUploading(true);
    setExcelStatus(null);
    try {
      await importStoresFromExcel(file, mode);
      setExcelStatus({ type: 'success', message: `Magasins importés avec succès (mode : ${mode === 'replace' ? 'remplacement' : 'ajout'}).` });
    } catch {
      setExcelStatus({ type: 'error', message: 'Erreur lors de l\'import. Vérifiez le format du fichier.' });
    } finally {
      setExcelUploading(false);
      setTimeout(() => setExcelStatus(null), 4000);
    }
  };

  const inputClass = 'w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg/62 focus:outline-none focus:border-teal-400/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={toggleAdmin}>
      <div
        className="bg-navy-900 border border-navy-600/50 rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-fg/12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{isAdminUser ? 'Administration' : 'Presets'}</h2>
              <p className="text-[10px] text-fg/60">
                {isAdminUser
                  ? 'Gérer les presets, leviers, magasins et configuration'
                  : 'Presets définis par l’admin et vos presets personnels'}
              </p>
            </div>
          </div>
          <button onClick={toggleAdmin} className="p-2 rounded-lg hover:bg-fg/10 text-fg/72 hover:text-fg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs (admin seulement) */}
        {isAdminUser && (
          <div className="flex border-b border-fg/12 px-4 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium rounded-t-lg transition-all border-b-2 ${
                  tab === t.id
                    ? 'text-teal-400 bg-teal-400/5 border-teal-400'
                    : 'text-fg/60 hover:text-fg/88 hover:bg-fg/10 border-transparent'
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">

          {/* ─── PRESETS TAB ─── */}
          {tab === 'presets' && (
            <>
              {isAdminUser ? (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Presets administrateur</h3>
                  <p className="text-[11px] text-fg/55 -mt-2 mb-1">
                    Uniquement les presets globaux — les presets personnels des utilisateurs ne sont pas listés ici.
                  </p>
                  {adminPresetsList.length === 0 ? (
                    <p className="text-xs text-fg/50 py-2">Aucun preset administrateur.</p>
                  ) : (
                    adminPresetsList.map((preset, idx) => (
                      <PresetRow
                        key={preset.id}
                        preset={preset}
                        leverConfigs={leverConfigs}
                        readOnly={false}
                        onRemove={() => removePreset(preset.id, removeCtx)}
                        onMoveUp={() => moveAdminPreset(idx, -1)}
                        onMoveDown={() => moveAdminPreset(idx, 1)}
                        isFirst={idx === 0}
                        isLast={idx === adminPresetsList.length - 1}
                      />
                    ))
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Presets administrateur</h3>
                  <p className="text-[11px] text-fg/55 -mt-2 mb-1">Lecture seule — définis dans un profil admin.</p>
                  {adminPresetsList.length === 0 ? (
                    <p className="text-xs text-fg/50 py-2">Aucun preset administrateur.</p>
                  ) : (
                    adminPresetsList.map(preset => (
                      <PresetRow
                        key={preset.id}
                        preset={preset}
                        leverConfigs={leverConfigs}
                        readOnly
                        onRemove={() => {}}
                      />
                    ))
                  )}

                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72 pt-4">Mes presets</h3>
                  {myPresetsList.length === 0 ? (
                    <p className="text-xs text-fg/50 py-2">Vous n’avez pas encore de preset personnel.</p>
                  ) : (
                    myPresetsList.map(preset => (
                      <PresetRow
                        key={preset.id}
                        preset={preset}
                        leverConfigs={leverConfigs}
                        readOnly={false}
                        onRemove={() => removePreset(preset.id, removeCtx)}
                      />
                    ))
                  )}
                </>
              )}

              <div className="rounded-xl border border-navy-600/35 bg-navy-800/25 px-4 py-3 text-[11px] leading-relaxed text-fg/68">
                <p className="text-[10px] uppercase tracking-wider text-fg/52 mb-2">Créer un preset</p>
                <p>
                  Fermez cette fenêtre et, dans la vue principale, ouvrez une <span className="text-fg/88">hypothèse</span>. Ajoutez au moins un levier et réglez les paramètres souhaités, puis cliquez sur l’icône{' '}
                  <span className="text-amber-400/90 font-medium">marque-page</span> à droite du titre de l’hypothèse pour enregistrer
                  {isAdminUser ? ' cette configuration comme preset.' : ' un preset dans votre bibliothèque personnelle.'}
                </p>
              </div>
            </>
          )}

          {/* ─── LEVERS TAB ─── */}
          {tab === 'levers' && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Configuration des leviers</h3>
              <p className="text-[11px] text-fg/62">Modifier les paramètres par défaut de chaque levier média.</p>

              <div className="space-y-3">
                {LEVER_TYPES.map(type => {
                  const t = type as LeverType;
                  const cfg = leverConfigs[t];
                  if (!cfg) return null;
                  const margin = cfg.defaultCpm > 0 ? ((cfg.defaultCpm - (cfg.purchaseCpm ?? 0)) / cfg.defaultCpm) * 100 : 0;
                  const marginEuro = cfg.defaultCpm - (cfg.purchaseCpm ?? 0);
                  return (
                    <div key={t} className="glass-card p-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="text-sm font-semibold">{cfg.label || t}</span>
                        {cfg.family && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-700 text-fg/60">{cfg.family}</span>
                        )}
                        <span className="ml-auto text-[11px] font-mono">
                          Marge&nbsp;
                          <span className={margin >= 40 ? 'text-teal-400 font-semibold' : margin >= 35 ? 'text-amber-400 font-semibold' : 'text-coral-400 font-semibold'}>
                            {margin.toFixed(1)}%
                          </span>
                          <span className="text-fg/45"> · {marginEuro.toFixed(2)}€</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">CPM vente (€)</label>
                          <PlainNumericInput
                            value={cfg.defaultCpm}
                            onChange={v => updateLeverConfig(t, { defaultCpm: v })}
                            min={0}
                            step={0.1}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">CPM achat (€)</label>
                          <PlainNumericInput
                            value={cfg.purchaseCpm ?? 0}
                            onChange={v => updateLeverConfig(t, { purchaseCpm: v })}
                            min={0}
                            step={0.1}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Budget min/mag (€)</label>
                          <PlainNumericInput
                            value={cfg.minBudgetPerStore}
                            onChange={v => updateLeverConfig(t, { minBudgetPerStore: v })}
                            min={0}
                            step={1}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Couverture max (%)</label>
                          <PlainNumericInput
                            value={cfg.maxCoverage}
                            onChange={v => updateLeverConfig(t, { maxCoverage: v })}
                            min={0}
                            max={100}
                            step={1}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">% auto budget</label>
                          <PlainNumericInput
                            value={cfg.autoBudgetPercent}
                            onChange={v => updateLeverConfig(t, { autoBudgetPercent: v })}
                            min={0}
                            max={100}
                            step={1}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Couleur</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={cfg.color}
                              onChange={e => updateLeverConfig(t, { color: e.target.value })}
                              className="w-8 h-8 rounded-lg border border-navy-600/30 bg-transparent cursor-pointer"
                            />
                            <span className="text-[10px] text-fg/60 font-mono">{cfg.color}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-fg/10 pt-3 space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-fg/60 block">Logo</label>
                        <p className="text-[10px] text-fg/50 leading-snug">
                          Affiché comme un logo importé (même cadre partout). Les grandes marques ont un fichier par défaut dans{' '}
                          <span className="font-mono text-fg/55">/public/levers/</span>.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <LeverLogoBadge cfg={cfg} className="w-10 h-10" iconClassName="w-5 h-5" />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openLeverLogoPicker(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-navy-600/40 text-[11px] text-fg/80 hover:bg-fg/8 hover:border-teal-400/25 transition-colors"
                            >
                              <Image className="w-3.5 h-3.5" />
                              Importer une image
                            </button>
                            {LEVER_CONFIGS[t]?.logoUrl && (
                              <button
                                type="button"
                                onClick={() => updateLeverConfig(t, { logoUrl: null })}
                                className="px-2.5 py-1.5 rounded-lg border border-navy-600/40 text-[11px] text-fg/70 hover:bg-fg/8 transition-colors"
                              >
                                Logo par défaut
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => updateLeverConfig(t, { logoUrl: '' })}
                              className="px-2.5 py-1.5 rounded-lg border border-navy-600/40 text-[11px] text-fg/70 hover:bg-fg/8 transition-colors"
                            >
                              Icône Lucide seule
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <input
                ref={leverLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={onLeverLogoFile}
              />
            </>
          )}

          {/* ─── STORES TAB ─── */}
          {tab === 'stores' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Gestion des magasins</h3>
                  <p className="text-[11px] text-fg/62">{stores.length} magasin{stores.length > 1 ? 's' : ''} configuré{stores.length > 1 ? 's' : ''}.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={e => handleExcelUpload(e, 'replace')} className="hidden" />
                  <button
                    onClick={() => excelInputRef.current?.click()}
                    disabled={excelUploading}
                    title="Importer un fichier Excel (remplace la liste actuelle)"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400/10 text-teal-400 text-[11px] font-medium rounded-lg hover:bg-teal-400/20 disabled:opacity-40 transition-colors border border-teal-400/20"
                  >
                    <Upload className="w-3 h-3" />
                    {excelUploading ? 'Import…' : 'Import Excel'}
                  </button>
                </div>
              </div>

              {excelStatus && (
                <div className={`text-[11px] rounded-lg px-3 py-2 animate-fade-in ${
                  excelStatus.type === 'success'
                    ? 'bg-teal-400/10 text-teal-400'
                    : 'bg-coral-400/10 text-coral-400'
                }`}>
                  {excelStatus.message}
                </div>
              )}

              <div className="space-y-2">
                {stores.map(store => (
                  <div key={store.id} className="glass-card px-4 py-3 flex items-center gap-3">
                    <MapPin className="w-3.5 h-3.5 text-fg/62 shrink-0" />
                    <input
                      type="text"
                      value={store.name}
                      onChange={e => updateStore(store.id, { name: e.target.value })}
                      className="flex-1 bg-transparent text-xs text-fg border-b border-transparent hover:border-navy-600/30 focus:border-teal-400/40 focus:outline-none py-1"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-fg/62">Pop.</label>
                      <PlainNumericInput
                        value={store.population}
                        onChange={v => updateStore(store.id, { population: v })}
                        min={0}
                        step={1}
                        className="w-24 bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1 text-[11px] text-fg focus:outline-none focus:border-teal-400/40"
                      />
                    </div>
                    <button
                      onClick={() => removeStore(store.id)}
                      className="p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStoreName}
                  onChange={e => setNewStoreName(e.target.value)}
                  placeholder="Nom du nouveau magasin"
                  className={inputClass + ' flex-1'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newStoreName.trim()) {
                      addStore(newStoreName.trim());
                      setNewStoreName('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newStoreName.trim()) {
                      addStore(newStoreName.trim());
                      setNewStoreName('');
                    }
                  }}
                  disabled={!newStoreName.trim()}
                  className="flex items-center gap-1.5 px-4 bg-teal-400/15 text-teal-400 text-xs font-medium rounded-lg hover:bg-teal-400/25 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
            </>
          )}

          {/* ─── PARAMS TAB ─── */}
          {tab === 'params' && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Paramètres globaux</h3>
              <p className="text-[11px] text-fg/62">Ces paramètres impactent les calculs de couverture et de budget.</p>

              <div className="glass-card p-4 space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Population moyenne par magasin</label>
                  <PlainNumericInput
                    value={globalParams.defaultPopulation}
                    onChange={v => updateGlobalParams({ defaultPopulation: v })}
                    min={0}
                    step={1}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-fg/55 mt-1">Utilisé pour le calcul de la couverture quand la population du magasin n'est pas définie.</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Budget total par défaut (€)</label>
                  <PlainNumericInput
                    value={globalParams.defaultTotalBudget}
                    onChange={v => updateGlobalParams({ defaultTotalBudget: v })}
                    min={0}
                    step={1000}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-fg/55 mt-1">Budget total utilisé par défaut à la création d'une nouvelle hypothèse.</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Budget max par magasin (€)</label>
                  <PlainNumericInput
                    value={globalParams.maxBudgetPerStore}
                    onChange={v => updateGlobalParams({ maxBudgetPerStore: v })}
                    min={0}
                    step={1}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-fg/55 mt-1">Budget max par magasin appliqué par défaut aux nouvelles hypothèses (déclenche une alerte si dépassé).</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Valeur max du slider Budget (€)</label>
                  <PlainNumericInput
                    value={globalParams.maxBudgetSlider}
                    onChange={v => updateGlobalParams({ maxBudgetSlider: v })}
                    min={1000}
                    step={1000}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-fg/55 mt-1">Valeur maximale affichée sur le slider de budget par levier.</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">Valeur max du slider Répétition (×)</label>
                  <PlainNumericInput
                    value={globalParams.maxRepetitionSlider}
                    onChange={v => updateGlobalParams({ maxRepetitionSlider: v })}
                    min={1}
                    max={100}
                    step={1}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-fg/55 mt-1">Valeur maximale affichée sur le slider de répétition par levier.</p>
                </div>
              </div>

              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72 pt-2">Récapitulatif des coefficients</h3>
              <div className="glass-card p-4">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-fg/60 text-left">
                      <th className="pb-2 font-medium">Levier</th>
                      <th className="pb-2 font-medium">Vente</th>
                      <th className="pb-2 font-medium">Achat</th>
                      <th className="pb-2 font-medium">Marge</th>
                      <th className="pb-2 font-medium">Min/mag</th>
                      <th className="pb-2 font-medium">Couv. max</th>
                    </tr>
                  </thead>
                  <tbody className="text-fg/88">
                    {LEVER_TYPES.map(type => {
                      const cfg = leverConfigs[type];
                      if (!cfg) return null;
                      const margin = cfg.defaultCpm > 0 ? ((cfg.defaultCpm - (cfg.purchaseCpm ?? 0)) / cfg.defaultCpm) * 100 : 0;
                      return (
                        <tr key={type} className="border-t border-fg/12">
                          <td className="py-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                            {cfg.label || type}
                          </td>
                          <td className="py-2">{cfg.defaultCpm.toFixed(2)}€</td>
                          <td className="py-2">{(cfg.purchaseCpm ?? 0).toFixed(2)}€</td>
                          <td className={`py-2 font-semibold ${margin >= 40 ? 'text-teal-400' : margin >= 35 ? 'text-amber-400' : 'text-coral-400'}`}>{margin.toFixed(1)}%</td>
                          <td className="py-2">{cfg.minBudgetPerStore}€</td>
                          <td className="py-2">{cfg.maxCoverage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ─── IMPORT/EXPORT TAB ─── */}
          {tab === 'importexport' && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Exporter</h3>
              <p className="text-[11px] text-fg/62">Télécharger la configuration complète (simulation, presets, leviers, magasins).</p>

              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-400/15 text-teal-400 text-xs font-medium rounded-lg hover:bg-teal-400/25 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter en JSON
              </button>

              <div className="border-t border-fg/12 my-2" />

              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Importer</h3>
              <p className="text-[11px] text-fg/62">Charger une configuration depuis un fichier JSON ou coller le contenu.</p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-navy-600/30 text-fg/65 hover:text-teal-400 hover:border-teal-400/30 transition-all text-xs"
              >
                <Upload className="w-4 h-4" />
                Choisir un fichier JSON
              </button>

              <div className="text-center text-[10px] text-fg/55">ou coller le JSON ci-dessous</div>

              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder='{"simulation": ..., "presets": ..., "leverConfigs": ..., "stores": ..., "globalParams": ...}'
                className={inputClass + ' h-28 resize-none font-mono text-[10px]'}
              />

              <button
                onClick={() => handleImport(importText)}
                disabled={!importText.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-400/15 text-teal-400 text-xs font-medium rounded-lg hover:bg-teal-400/25 disabled:opacity-30 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Importer
              </button>

              {importStatus === 'success' && (
                <div className="text-center text-xs text-teal-400 bg-teal-400/10 rounded-lg py-2 animate-fade-in">
                  Import réussi !
                </div>
              )}
              {importStatus === 'error' && (
                <div className="text-center text-xs text-coral-400 bg-coral-400/10 rounded-lg py-2 animate-fade-in">
                  Erreur : JSON invalide ou format incorrect.
                </div>
              )}
            </>
          )}

          {/* ─── HISTORY TAB ─── */}
          {tab === 'history' && <HistoryTab />}
        </div>
      </div>
    </div>
  );
}

function HistoryTab() {
  const all = useHistoryStore(s => s.all);
  const fetchAll = useHistoryStore(s => s.fetchAll);
  const jumpTo = useHistoryStore(s => s.jumpTo);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const fmt = (ts: string) => {
    const d = new Date(ts.endsWith('Z') || ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">Historique des modifications</h3>
          <p className="text-[11px] text-fg/62">{all.length} entrée{all.length > 1 ? 's' : ''}. Cliquer sur « Restaurer » pour revenir à cet état.</p>
        </div>
        <button
          onClick={() => void fetchAll()}
          className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-navy-800/55 text-fg/78 border border-fg/12 hover:text-fg/92 hover:bg-navy-800/90 transition-colors"
        >
          Rafraîchir
        </button>
      </div>

      {all.length === 0 ? (
        <p className="text-xs text-fg/50 py-4 text-center">Aucune entrée d'historique.</p>
      ) : (
        <div className="space-y-1.5">
          {all.map(entry => (
            <div
              key={entry.id}
              className="glass-card px-3 py-2 flex items-center gap-3 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-fg/92 truncate">{entry.actionLabel}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-fg/55">
                  <span>{fmt(entry.ts)}</span>
                  {entry.actorPseudo && (
                    <>
                      <span className="text-fg/25">·</span>
                      <span className="text-fg/72">{entry.actorPseudo}</span>
                    </>
                  )}
                  {entry.simulationId && (
                    <>
                      <span className="text-fg/25">·</span>
                      <span className="font-mono text-fg/45 truncate">{entry.simulationId}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => void jumpTo(entry.id)}
                title="Restaurer cet état"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-400/12 text-teal-400 border border-teal-400/20 hover:bg-teal-400/20 transition-colors text-[11px] font-medium shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurer
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
