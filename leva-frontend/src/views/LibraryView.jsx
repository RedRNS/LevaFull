import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockTools } from '../data/mockData';
import Modal from '../components/Modal';
import AppIcon from '../components/AppIcon';

const PRIORITY_FILTERS = ['Semua', 'Prioritas Tinggi', 'Sangat Bagus', 'Coba Nanti'];
const CATEGORY_FILTERS = ['Semua', 'Research', 'Writing', 'Coding', 'Data', 'Academic', 'Productivity'];
const SORT_OPTIONS = [
  { value: 'latest', label: 'Terbaru disimpan' },
  { value: 'oldest', label: 'Terlama disimpan' },
  { value: 'rating', label: 'Rating tertinggi' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
];

const INDONESIAN_MONTH_MAP = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  agu: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  des: 11,
};

const pricingMeta = (pricingType) => {
  const map = {
    free: { label: 'Free', bg: '#DCFCE7', color: '#15803D' },
    freemium: { label: 'Freemium', bg: '#FEF3C7', color: '#B45309' },
    paid: { label: 'Berbayar', bg: '#FEE2E2', color: '#B91C1C' },
    opensource: { label: 'Open-source', bg: '#DBEAFE', color: '#1D4ED8' },
  };

  return map[pricingType] || map.freemium;
};

const parseSavedAtToTimestamp = (savedAt, fallback = 0) => {
  if (!savedAt || typeof savedAt !== 'string') return fallback;

  const parts = savedAt.trim().split(' ');
  if (parts.length < 3) return fallback;

  const day = Number(parts[0]);
  const month = INDONESIAN_MONTH_MAP[parts[1].slice(0, 3).toLowerCase()];
  const year = Number(parts[2]);

  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) return fallback;

  return new Date(year, month, day).getTime();
};

// Badge component for priority
function PriorityBadge({ priorityKey, label }) {
  const styles = {
    high:  { background: '#FEE2E2', color: '#DC2626' },
    good:  { background: '#D1FAE5', color: '#059669' },
    later: { background: '#DBEAFE', color: '#2563EB' },
  };
  const s = styles[priorityKey] || styles.later;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function PricingBadge({ pricingType }) {
  const pricing = pricingMeta(pricingType);

  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: pricing.bg, color: pricing.color, whiteSpace: 'nowrap' }}>
      {pricing.label}
    </span>
  );
}

// Saved Tool Card
function SavedToolCard({ tool, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{ padding: '18px 20px', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>{tool.name}</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="link" size={12} /> {tool.url}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PricingBadge pricingType={tool.pricingType} />
          <PriorityBadge priorityKey={tool.priorityKey} label={tool.priority} />
        </div>
      </div>

      {/* Category + date */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          {tool.category}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          Disimpan {tool.savedAt}
        </span>
      </div>

      {/* Note */}
      {tool.note && (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {tool.note}
        </p>
      )}

      {/* Keywords */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {tool.keywords.map(kw => (
          <span
            key={kw}
            style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)' }}
          >
            #{kw}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={`https://${tool.url}`} target="_blank" rel="noreferrer"
          style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: 9, padding: '8px', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', transition: 'background 0.2s',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Buka Tool <AppIcon name="external-link" size={14} color="#fff" />
          </span>
        </a>
        <button
          onClick={() => onDelete(tool)}
          style={{
            flex: 1, padding: '8px', borderRadius: 9, border: '1px solid #FEE2E2',
            background: '#FFF5F5', color: '#DC2626', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
          onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="trash" size={14} /> Hapus
          </span>
        </button>
      </div>
    </div>
  );
}

// Main Library View
export default function LibraryView() {
  const { savedTools, setSavedTools, setActiveView, removeToolFromLibrary } = useApp();
  const [priorityFilter, setPriorityFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearchVal, setDebouncedSearchVal] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toolToDelete, setToolToDelete] = useState(null);
  const [newTool, setNewTool] = useState({ name: '', url: '', note: '', category: 'Research' });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchVal(searchVal.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchVal]);

  const ratingByName = useMemo(() => {
    const map = new Map();
    mockTools.forEach((tool) => {
      map.set(tool.name.toLowerCase(), tool.rating ?? 0);
    });
    return map;
  }, []);

  const pricingByName = useMemo(() => {
    const map = new Map();
    mockTools.forEach((tool) => {
      map.set(tool.name.toLowerCase(), tool.pricingType ?? 'freemium');
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    const base = savedTools.filter((tool) => {
      const matchPriority = priorityFilter === 'Semua' || tool.priority === priorityFilter;
      const matchCategory = categoryFilter === 'Semua' || tool.category === categoryFilter;

      const searchableText = [
        tool.name,
        tool.description,
        tool.note,
        tool.tags,
        tool.keywords?.join(' '),
      ].filter(Boolean).join(' ').toLowerCase();

      const matchSearch = !debouncedSearchVal || searchableText.includes(debouncedSearchVal);
      return matchPriority && matchCategory && matchSearch;
    });

    /* UI/UX Fix: Step 7 — Display as many choices as possible (grid vs scroll). Drop-down untuk sorting meminimalisir pencarian manual. Survei: 52,5% kesulitan temukan referensi tersimpan. */
    const withMeta = base.map((tool, index) => ({
      ...tool,
      _timestamp: tool.savedTimestamp ?? parseSavedAtToTimestamp(tool.savedAt, 0),
      _rating: tool.rating ?? ratingByName.get(tool.name.toLowerCase()) ?? 0,
      pricingType: tool.pricingType ?? pricingByName.get(tool.name.toLowerCase()) ?? 'freemium',
    }));

    withMeta.sort((a, b) => {
      if (sortBy === 'latest') return b._timestamp - a._timestamp;
      if (sortBy === 'oldest') return a._timestamp - b._timestamp;
      if (sortBy === 'rating') return b._rating - a._rating;
      if (sortBy === 'az') return a.name.localeCompare(b.name, 'id-ID');
      if (sortBy === 'za') return b.name.localeCompare(a.name, 'id-ID');
      return 0;
    });

    return withMeta;
  }, [savedTools, priorityFilter, categoryFilter, debouncedSearchVal, sortBy, ratingByName, pricingByName]);

  const handleDeleteRequest = (tool) => {
    /* UI/UX Fix: Step 6 — Output device harus memberi respond jelas ke aksi user. Step 7 — Aksi destruktif (hapus) harus ada safeguard/konfirmasi. Survei: 52,5% user sulit temukan referensi. */
    setToolToDelete(tool);
  };

  const handleConfirmDelete = () => {
    if (!toolToDelete) return;
    removeToolFromLibrary(toolToDelete.id);
    setToolToDelete(null);
  };

  const handleAddTool = () => {
    if (!newTool.name.trim() || !newTool.url.trim()) return;
    const entry = {
      id: Date.now(),
      name: newTool.name,
      url: newTool.url.replace(/^https?:\/\//, ''),
      priority: 'Sangat Bagus',
      priorityKey: 'good',
      pricingType: 'freemium',
      category: newTool.category,
      keywords: [newTool.category.toLowerCase(), 'ai tools', 'manual'],
      savedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      savedTimestamp: Date.now(),
      description: '',
      rating: 0,
      note: newTool.note,
    };
    setSavedTools(prev => [entry, ...prev]);
    setNewTool({ name: '', url: '', note: '', category: 'Research' });
    setShowAddModal(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 9, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', marginBottom: 12,
  };

  const isLibraryEmpty = savedTools.length === 0;

  const handleResetFilters = () => {
    setPriorityFilter('Semua');
    setCategoryFilter('Semua');
    setSearchVal('');
    setDebouncedSearchVal('');
    setSortBy('latest');
  };

  return (
    <div className="main-content view-enter" style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="library" size={22} /> Library Tools Saya
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Koleksi alat AI yang sudah kamu simpan, dilengkapi label prioritas otomatis.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="plus" size={14} color="#fff" /> Tambah Manual
          </span>
        </button>
      </div>

      {isLibraryEmpty ? (
        <div style={{ minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 12px' }}>
          <div style={{ width: 84, height: 84, borderRadius: 20, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <AppIcon name="folder" size={44} color="#94A3B8" />
          </div>
          <h3 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Library-mu masih kosong
          </h3>
          <p style={{ margin: '0 0 22px', maxWidth: 520, fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            Mulai simpan tools dari Dashboard atau Chat &amp; Task untuk membangun koleksimu!
          </p>
          <button className="btn-primary" onClick={() => setActiveView('dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}>
            Ke Dashboard <AppIcon name="arrow-right" size={14} color="#fff" />
          </button>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Tools', val: savedTools.length, icon: 'folder' },
              { label: 'Prioritas Tinggi', val: savedTools.filter(t => t.priorityKey === 'high').length, icon: 'flame' },
              { label: 'Sangat Bagus', val: savedTools.filter(t => t.priorityKey === 'good').length, icon: 'check' },
            ].map(stat => (
              <div key={stat.label} className="card" style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex' }}><AppIcon name={stat.icon} size={22} /></span>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>{stat.val}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 24 }}>

            {/* Filter Sidebar */}
            <div style={{ width: 200, flexShrink: 0 }}>
              {/* Search */}
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Cari nama tool, tag, atau kategori..."
                style={{ ...inputStyle, marginBottom: 20 }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', margin: 0 }}>PRIORITAS</p>
                <span
                  className="tooltip-host tooltip-help-icon"
                  data-tooltip="Prioritas ditentukan otomatis berdasarkan frekuensi penggunaan dan rating tool."
                  aria-label="Info prioritas"
                  tabIndex={0}
                >
                  ?
                </span>
              </div>
              {PRIORITY_FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPriorityFilter(f)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    background: priorityFilter === f ? 'var(--color-primary-light)' : 'transparent',
                    color: priorityFilter === f ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: priorityFilter === f ? 600 : 400,
                    marginBottom: 2, transition: 'all 0.15s',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  {f}
                </button>
              ))}

              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', margin: '20px 0 8px' }}>KATEGORI</p>
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCategoryFilter(f)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    background: categoryFilter === f ? 'var(--color-primary-light)' : 'transparent',
                    color: categoryFilter === f ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: categoryFilter === f ? 600 : 400,
                    marginBottom: 2, transition: 'all 0.15s',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Tool Cards Grid */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Menampilkan <strong>{filtered.length}</strong> dari {savedTools.length} tools
                </p>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <span style={{ fontWeight: 600 }}>Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 9,
                      fontSize: 13,
                      padding: '7px 10px',
                      color: 'var(--color-text-primary)',
                      background: '#fff',
                      outline: 'none',
                    }}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 20px' }}>
                  <span style={{ display: 'inline-flex', position: 'relative' }}>
                    <AppIcon name="search" size={48} color="#94A3B8" />
                    <span style={{ position: 'absolute', right: -2, bottom: -1, width: 18, height: 18, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AppIcon name="x" size={12} color="#64748B" />
                    </span>
                  </span>
                  <p style={{ margin: '14px 0 14px', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                    Tidak ada tools yang cocok dengan filter ini. Coba ubah filter atau tambah tools baru.
                  </p>
                  <button className="btn-secondary" onClick={handleResetFilters}>
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="library-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {filtered.map(tool => (
                    <SavedToolCard key={tool.id} tool={tool} onDelete={handleDeleteRequest} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Tool Modal */}
      {showAddModal && (
        <Modal title="Tambah Tool Baru" onClose={() => setShowAddModal(false)}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nama Tool *</label>
            <input value={newTool.name} onChange={e => setNewTool(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: Perplexity AI" style={inputStyle} />
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>URL Tool *</label>
            <input value={newTool.url} onChange={e => setNewTool(p => ({ ...p, url: e.target.value }))} placeholder="https://perplexity.ai" style={inputStyle} />
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Kategori</label>
            <select value={newTool.category} onChange={e => setNewTool(p => ({ ...p, category: e.target.value }))} style={{ ...inputStyle }}>
              {CATEGORY_FILTERS.filter(f => f !== 'Semua').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Catatan (opsional)</label>
            <textarea value={newTool.note} onChange={e => setNewTool(p => ({ ...p, note: e.target.value }))} placeholder="Untuk apa tool ini?" rows={3} style={{ ...inputStyle, resize: 'none' }} />
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
              Leva akan otomatis menganalisis dan memberikan label prioritas serta keywords.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Batal</button>
              <button className="btn-primary" onClick={handleAddTool} style={{ flex: 2 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="plus" size={14} color="#fff" /> Tambah & Generate Label
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toolToDelete && (
        <Modal title="Hapus Tool?" onClose={() => setToolToDelete(null)}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Apakah kamu yakin ingin menghapus {toolToDelete.name} dari library?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setToolToDelete(null)} style={{ flex: 1 }}>
              Batal
            </button>
            <button
              onClick={handleConfirmDelete}
              style={{
                flex: 1,
                background: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '10px 16px',
              }}
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
