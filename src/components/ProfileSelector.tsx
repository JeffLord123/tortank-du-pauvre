import { useState } from 'react';
import { Sparkles, UserPlus, LogIn, Shield, User, Trash2, X } from 'lucide-react';
import { useProfileStore } from '../store/profileStore';
import ThemeToggle from './ThemeToggle';
import { blurOnEnter } from './NumInput';

type Props = {
  /** Si true, l’utilisateur peut fermer sans changer (retour à l’app). */
  allowDismiss: boolean;
  onDismiss: () => void;
};

export default function ProfileSelector({ allowDismiss, onDismiss }: Props) {
  const { profiles, addProfile, setActiveProfile, removeProfile } = useProfileStore();
  const [creating, setCreating] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const canCreate = pseudo.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    addProfile(pseudo.trim(), isAdmin);
    setPseudo('');
    setIsAdmin(false);
    setCreating(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {allowDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-lg text-fg/72 hover:bg-fg/10 hover:text-fg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#0c1218]" />
            </div>
            <span className="text-xl font-bold tracking-tight">Tortank</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            {allowDismiss ? 'Changer de profil' : 'Choisir un profil'}
          </h1>
          <p className="text-fg/75 text-sm">
            Sélectionnez un profil ou créez-en un avec votre pseudo et le mode accès.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          {profiles.length === 0 && !creating && (
            <p className="text-center text-fg/65 text-sm py-6">
              Aucun profil pour l’instant. Créez votre premier profil ci-dessous.
            </p>
          )}

          {profiles.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-navy-600/35 bg-navy-900/40 hover:border-teal-400/25 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-400/10 flex items-center justify-center shrink-0">
                {p.isAdmin ? <Shield className="w-5 h-5 text-teal-400" /> : <User className="w-5 h-5 text-fg/72" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-fg truncate">{p.pseudo}</div>
                <div className="text-[10px] text-fg/55">{p.isAdmin ? 'Administrateur' : 'Utilisateur'}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProfile(p.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-400/15 text-teal-400 text-xs font-medium hover:bg-teal-400/25 transition-colors shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Ouvrir
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Supprimer le profil « ${p.pseudo} » ?`)) removeProfile(p.id);
                }}
                className="p-2 rounded-lg text-fg/45 hover:text-coral-400 hover:bg-coral-400/10 transition-colors shrink-0"
                title="Supprimer ce profil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-navy-600/40 text-fg/72 hover:text-teal-400 hover:border-teal-400/35 transition-all text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Nouveau profil
            </button>
          ) : (
            <div className="rounded-xl border border-teal-400/20 bg-navy-900/60 p-4 space-y-4">
              <p className="text-[10px] uppercase tracking-wider text-fg/50">Nouveau profil</p>
              <div>
                <label className="block text-[11px] font-medium text-fg/75 mb-1.5">Pseudo</label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={e => setPseudo(e.target.value)}
                  onKeyDown={blurOnEnter}
                  placeholder="Votre nom ou surnom"
                  className="w-full bg-navy-800/80 border border-navy-600/50 rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg/55 focus:outline-none focus:border-teal-400/50"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-fg">Mode administrateur</div>
                  <div className="text-[11px] text-fg/55">Accès complet (leviers, magasins, import…)</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAdmin}
                  onClick={() => setIsAdmin(a => !a)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isAdmin ? 'bg-teal-500' : 'bg-navy-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      isAdmin ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setPseudo('');
                    setIsAdmin(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-fg/72 hover:bg-fg/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 text-white disabled:opacity-35"
                >
                  Créer et ouvrir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
