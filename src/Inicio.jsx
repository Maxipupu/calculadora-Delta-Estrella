import React, { useMemo, useState } from 'react';
import { Triangle, Cable, Zap, CircuitBoard, Gauge, RotateCw, Divide, GitBranch, Battery, ArrowLeftRight, Search, Star, X, ArrowUpRight, SlidersHorizontal, Sparkles, Calculator } from 'lucide-react';
import Delta from './Delta.jsx';
import Linea from './Linea.jsx';
import Trifasica from './Trifasica.jsx';
import Circuitos from './Circuitos.jsx';
import Convertidor from './Convertidor.jsx';
import { Potencias, Fases, Divisores, Energia } from './Herramientas.jsx';

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
    const saved = JSON.parse(localStorage.getItem('electrica-favoritos-v1') || '[]');
    return Array.isArray(saved) ? saved.filter((id) => TOOLS.some((t) => t.id === id)) : [];
  } catch { return []; }
};

export default function Inicio() {
  const [tool, setTool] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [favorites, setFavorites] = useState(loadFavorites);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const back = () => setTool(null);
  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem('electrica-favoritos-v1', JSON.stringify(next)); } catch { /* localStorage no disponible */ }
      return next;
    });
  };
  const filtered = useMemo(() => TOOLS.filter((t) =>
    (category === 'Todas' || t.category === category) &&
    (!onlyFavorites || favorites.includes(t.id)) &&
    normalize(`${t.name} ${t.desc} ${t.category} ${t.tags}`).includes(normalize(query.trim()))
  ), [category, query, onlyFavorites, favorites]);
  const featured = favorites.length ? TOOLS.find(t => t.id === favorites[0]) : TOOLS[1];

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
      <div className="electric-shell mx-auto px-4 pb-14">
        <header className="electric-header">
          <div className="electric-logo"><Zap size={23} strokeWidth={2.5}/></div>
          <div className="min-w-0 flex-1"><p className="electric-eyebrow">HERRAMIENTAS DE INGENIERÍA</p><h1 className="electric-title">Electro<span>Calc</span></h1></div>
          <div className="electric-header-icon" aria-label="Calculadora eléctrica"><Calculator size={20}/></div>
        </header>

        <section className="electric-hero">
          <div className="electric-hero-glow" aria-hidden="true" />
          <div className="electric-hero-content">
            <div className="electric-hero-label"><Sparkles size={14}/> TU ESPACIO DE CÁLCULO</div>
            <h2>Electricidad,<br/><em>más simple.</em></h2>
            <p>Calcula, convierte y comprueba resultados desde tu celular.</p>
            <div className="electric-hero-stats"><strong>{TOOLS.length}</strong> herramientas <span/> <strong>4</strong> categorías</div>
          </div>
          <div className="electric-hero-orbit" aria-hidden="true"><Zap size={52}/></div>
        </section>

        <label className="electric-search" htmlFor="buscar-calculos"><Search size={20}/><input id="buscar-calculos" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar potencia, voltaje, trifásico..." autoComplete="off" />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={18}/></button>}</label>

        <div className="electric-section-top"><h2><SlidersHorizontal size={17}/> Explorar</h2><span>{filtered.length} de {TOOLS.length}</span></div>
        <nav className="electric-categories" aria-label="Filtrar por categoría">
          {CATEGORIES.map(c => <button type="button" key={c} className={category === c ? 'selected' : ''} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
        </nav>

        {!query && category === 'Todas' && !onlyFavorites && <button type="button" className="electric-featured" onClick={() => setTool(featured.id)}>
          <div><span className="electric-featured-kicker">{favorites.length ? 'TU FAVORITA' : 'ACCESO RÁPIDO'}</span><strong>{featured.name}</strong><span>{featured.desc}</span></div><span className="electric-featured-action"><ArrowUpRight size={20}/></span>
        </button>}

        <div className="electric-section-top electric-tools-heading"><h2>Calculadoras</h2><button type="button" className={`electric-fav-filter ${onlyFavorites ? 'selected' : ''}`} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}><Star size={15} fill={onlyFavorites ? 'currentColor' : 'none'}/>{onlyFavorites ? 'Ver todas' : 'Favoritas'}</button></div>
        {filtered.length ? <div className="electric-tools-grid">{filtered.map(({id, name, desc, icon: Icon, color, category: group}) => <article className="electric-tool-card" key={id}>
          <button type="button" className="electric-tool-open" onClick={() => setTool(id)} aria-label={`Abrir ${name}`}>
            <span className={`electric-tool-icon tone-${color}`}><Icon size={23} strokeWidth={1.9}/></span>
            <span className="electric-tool-category">{group}</span>
            <strong>{name}</strong><span className="electric-tool-desc">{desc}</span>
            <span className="electric-tool-arrow"><ArrowUpRight size={16}/></span>
          </button>
          <button type="button" className={`electric-star ${favorites.includes(id) ? 'is-favorite' : ''}`} aria-label={`${favorites.includes(id) ? 'Quitar de' : 'Agregar a'} favoritas: ${name}`} aria-pressed={favorites.includes(id)} onClick={() => toggleFavorite(id)}><Star size={18} fill={favorites.includes(id) ? 'currentColor' : 'none'}/></button>
        </article>)}</div> : <div className="electric-empty"><Search size={28}/><strong>No se encontraron herramientas</strong><p>Prueba con otra búsqueda o cambia los filtros.</p><button onClick={() => { setQuery(''); setCategory('Todas'); setOnlyFavorites(false); }}>Restablecer filtros</button></div>}
        <p className="electric-footer">⚡ ElectroCalc · Diseñada para aprender y calcular</p>
      </div>
    </main>
  );
}
