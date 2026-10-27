import React, { useMemo, useState } from 'react';
import { Triangle, Cable, Zap, CircuitBoard, Gauge, RotateCw, Divide, GitBranch, Battery, ArrowLeftRight, Search, Star, ChevronRight, Calculator } from 'lucide-react';
import Delta from './Delta.jsx';
import Linea from './Linea.jsx';
import Trifasica from './Trifasica.jsx';
import Circuitos from './Circuitos.jsx';
import Convertidor from './Convertidor.jsx';
import { Potencias, Fases, Divisores, Energia } from './Herramientas.jsx';
import Cientifica from './Cientifica.jsx';
import mxLogo from './assets/mx-logo.webp';

const TOOLS = [
  { id: 'de', name: 'Delta ↔ Estrella', desc: 'Impedancias equivalentes', icon: Triangle, color: 'amber', category: 'Circuitos', tags: 'triángulo estrella resistencia impedancia' },
  { id: 'pot', name: 'Potencias', desc: 'Activa, reactiva, aparente y FP', icon: Gauge, color: 'green', category: 'Potencia', tags: 'P Q S factor potencia coseno phi' },
  { id: 'fas', name: 'Fases a 120°', desc: 'Sistema R, S y T · fasores', icon: RotateCw, color: 'rose', category: 'Trifásicos', tags: 'fasorial angulo fases' },
  { id: 'dv', name: 'Divisor de tensión', desc: 'Caída de tensión en serie', icon: Divide, color: 'blue', category: 'Circuitos', tags: 'voltaje resistencias voltios' },
  { id: 'di', name: 'Divisor de corriente', desc: 'Reparto de corriente en paralelo', icon: GitBranch, color: 'violet', category: 'Circuitos', tags: 'amperios paralelo ramas' },
  { id: 'en', name: 'Energía C y L', desc: 'Capacitores e inductores', icon: Battery, color: 'yellow', category: 'Potencia', tags: 'energia condensador bobina joules' },
  { id: 'linea', name: 'Línea con cargas', desc: 'Tensión, potencia y cargas', icon: Cable, color: 'teal', category: 'Circuitos', tags: 'linea monofasica carga' },
  { id: 'tri', name: 'Trifásico', desc: 'Análisis de cargas trifásicas', icon: Zap, color: 'blue', category: 'Trifásicos', tags: 'delta equilibrado desbalanceado' },
  { id: 'circ', name: 'Circuitos', desc: 'Nodos y superposición', icon: CircuitBoard, color: 'orange', category: 'Circuitos', tags: 'mallas nodos fuentes' },
  { id: 'conv', name: 'Conversor', desc: 'Prefijos y unidades SI', icon: ArrowLeftRight, color: 'cyan', category: 'Conversiones', tags: 'mega kilo mili micro ohm amperio voltio' },
];
const CATEGORIES = ['Todas', 'Circuitos', 'Potencia', 'Trifásicos', 'Conversiones'];
const normalize = (s) => s.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const loadFavorites = () => {
  try {
    const current = localStorage.getItem('electrica-favoritos-v2');
    if (current !== null) {
      const saved = JSON.parse(current);
      return Array.isArray(saved) ? saved.filter(id => TOOLS.some(t => t.id === id)) : ['circ'];
    }
    // Primera apertura tras actualizar: conservar preferencias anteriores y destacar Circuitos.
    const previous = JSON.parse(localStorage.getItem('electrica-favoritos-v1') || '[]');
    const initial = [...new Set(['circ', ...(Array.isArray(previous) ? previous : [])])];
    localStorage.setItem('electrica-favoritos-v2', JSON.stringify(initial));
    return initial;
  } catch { return ['circ']; }
};

export default function Inicio() {
  const [tool, setTool] = useState(null);
  const [category, setCategory] = useState('Todas');
  const [favorites, setFavorites] = useState(loadFavorites);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const back = () => setTool(null);
  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem('electrica-favoritos-v2', JSON.stringify(next)); } catch { /* localStorage no disponible */ }
      return next;
    });
  };
  const filtered = useMemo(() => TOOLS.filter((t) =>
    (category === 'Todas' || t.category === category) &&
    (!onlyFavorites || favorites.includes(t.id))
  ), [category, onlyFavorites, favorites]);
  const featured = TOOLS.find(t => t.id === 'circ');

  if (tool === 'scientific') return <Cientifica onBack={back} />;
  if (tool === 'de') return <Delta onBack={back} />;
  if (tool === 'pot') return <Potencias onBack={back} />;
  if (tool === 'fas') return <Fases onBack={back} />;
  if (tool === 'dv') return <Divisores onBack={back} tipo="v" />;
  if (tool === 'di') return <Divisores onBack={back} tipo="i" />;
  if (tool === 'en') return <Energia onBack={back} />;
  if (tool === 'linea') return <Linea onBack={back} />;
  if (tool === 'tri') return <Trifasica onBack={back} />;
  if (tool === 'circ') return <Circuitos onBack={back} />;
  if (tool === 'conv') return <Convertidor onBack={back} />;

  return (
    <main className="electric-home min-h-screen text-slate-100 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="electric-shell mx-auto px-4 pb-12">
        <header className="electric-header electric-header-panel">
          <div className="electric-logo"><Zap size={24} strokeWidth={2.5}/></div>
          <div className="electric-heading-copy">
            <span className="electric-kicker">HERRAMIENTAS DE INGENIERÍA</span>
            <h1 className="electric-title">Electro<span>Calc</span></h1>
          </div>
          <button type="button" className="electric-header-icon" aria-label="Abrir calculadora científica" title="Calculadora científica" onClick={() => setTool('scientific')}><Calculator size={22}/></button>
        </header>
        <div className="electric-divider" />
        <section className="electric-intro electric-intro-card">
          <div className="electric-intro-copy">
            <h2>Calculadoras</h2>
            <p>Selecciona una herramienta</p>
          </div>
          <div className="electric-mx-logo-wrap" aria-hidden="true">
            <img src={mxLogo} alt="" className="electric-mx-logo" />
          </div>
        </section>
        <nav className="electric-categories" aria-label="Filtrar por categoría">
          {CATEGORIES.map(c => <button type="button" key={c} className={category === c ? 'selected' : ''} aria-pressed={category === c} onClick={() => setCategory(c)}>{c === 'Conversiones' ? 'Conversión' : c}</button>)}
        </nav>
        {category === 'Todas' && !onlyFavorites && <button type="button" className="electric-featured" onClick={() => setTool('circ')}>
          <span className="electric-featured-star"><Star size={24} fill="currentColor"/></span>
          <span className="electric-featured-body"><strong>Circuitos eléctricos</strong><span>Nodos, superposición y análisis</span></span>
          <ChevronRight size={24} className="electric-featured-action" />
        </button>}
        <div className="electric-tools-heading">
          <h2>Herramientas</h2>
          <button type="button" className={`electric-fav-filter ${onlyFavorites ? 'selected' : ''}`} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}><Star size={17} fill={onlyFavorites ? 'currentColor' : 'none'}/>{onlyFavorites ? 'Ver todas' : 'Favoritas'}</button>
        </div>
        {filtered.length ? <div className="electric-tools-grid">{filtered.map(({id, name, desc, icon: Icon, color}) => <article className="electric-tool-card" key={id}>
          <button type="button" className="electric-tool-open" onClick={() => setTool(id)} aria-label={`Abrir ${name}`}>
            <span className={`electric-tool-icon tone-${color}`}><Icon size={25} strokeWidth={2}/></span>
            <span className="electric-tool-copy"><strong>{name}</strong><span className="electric-tool-desc">{desc}</span></span>
            <ChevronRight size={18} className="electric-tool-arrow" />
          </button>
          <button type="button" className={`electric-star ${favorites.includes(id) ? 'is-favorite' : ''}`} aria-label={`${favorites.includes(id) ? 'Quitar de' : 'Agregar a'} favoritas: ${name}`} aria-pressed={favorites.includes(id)} onClick={() => toggleFavorite(id)}><Star size={16} fill={favorites.includes(id) ? 'currentColor' : 'none'}/></button>
        </article>)}</div> : <div className="electric-empty"><Search size={28}/><strong>No se encontraron herramientas</strong><p>Prueba con otra categoría o cambia los filtros.</p><button type="button" onClick={() => { setCategory('Todas'); setOnlyFavorites(false); }}>Restablecer filtros</button></div>}
      </div>
    </main>
  );
}
