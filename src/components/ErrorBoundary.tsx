import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erreur inattendue lors du chargement.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Orbis Diplomatica runtime error:', error);
  }

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('orbis_diplomatica_save_v1');
    } catch {
      // Ignore storage access errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#060C16] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0D1626] border border-white/10 rounded-xl p-6 space-y-4 shadow-2xl">
            <h1 className="text-xl font-semibold text-amber-300">
              Orbis Diplomatica — Récupération
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Une erreur s’est produite lors de l’initialisation du jeu. Vous pouvez réinitialiser la
              sauvegarde locale pour relancer une partie propre.
            </p>
            <p className="text-xs font-mono text-rose-300/90 bg-slate-950/60 border border-rose-500/20 rounded-md p-2.5 break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Réinitialiser la sauvegarde et recharger
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
