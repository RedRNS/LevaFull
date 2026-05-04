import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockTools } from '../data/mockData';
import AppIcon from '../components/AppIcon';

// --- Category tag color helper
const tagClass = (cat) => {
  const map = {
    Research: 'tag tag-research', Writing: 'tag tag-writing',
    Coding: 'tag tag-coding', Data: 'tag tag-data',
    Academic: 'tag tag-academic', Productivity: 'tag tag-productivity',
  };
  return map[cat] || 'tag tag-research';
};

const pricingMeta = (pricingType) => {
  const map = {
    free: { label: 'Free', bg: '#DCFCE7', color: '#15803D' },
    freemium: { label: 'Freemium', bg: '#FEF3C7', color: '#B45309' },
    paid: { label: 'Berbayar', bg: '#FEE2E2', color: '#B91C1C' },
    opensource: { label: 'Open-source', bg: '#DBEAFE', color: '#1D4ED8' },
  };

  return map[pricingType] || map.free;
};

function PricingBadge({ pricingType }) {
  const price = pricingMeta(pricingType);
  const tooltipByType = {
    free: 'Sepenuhnya gratis untuk digunakan',
    freemium: 'Fitur dasar gratis, fitur premium berbayar',
    paid: 'Memerlukan langganan berbayar untuk akses penuh',
  };
  const tooltipText = tooltipByType[pricingType] || '';

  return (
    <span className={tooltipText ? 'tooltip-host' : undefined} data-tooltip={tooltipText || undefined} style={{ display: 'inline-flex' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 999,
          background: price.bg,
          color: price.color,
        }}
      >
        {price.label}
      </span>
    </span>
  );
}

function ToolTooltip({ tool, show }) {
  const price = pricingMeta(tool.pricingType);
  const detailText = tool.detailDesc || tool.desc;

  return (
    <div className={`tool-tooltip ${show ? 'visible' : ''}`}>
      {/* UI/UX Fix: Step 7 — Tooltip/balloon tip sebagai presentation control untuk info harga. Survei: 33,9% user terbentur paywall; Persona Bima butuh filter harga instan. */}
      <p className="tool-tooltip-title">{tool.name}</p>
      <p className="tool-tooltip-line">Status: <strong style={{ color: price.color }}>{price.label}</strong></p>
      <p className="tool-tooltip-line">Website: {tool.url}</p>
      <p className="tool-tooltip-desc">{detailText}</p>
      <span className="tool-tooltip-arrow" />
    </div>
  );
}

// --- Star rating display
function StarRating({ rating }) {
  return (
    <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

// --- Featured Tool Card (large, horizontal scroll)
function FeaturedToolCard({ tool, onSave, isSaved }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef(null);
  const handleSave = () => {
    if (isSaved) return;
    onSave(tool);
  };

  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  useEffect(() => {
    const handleEscape = () => setShowTooltip(false);
    window.addEventListener('leva:escape', handleEscape);

    return () => window.removeEventListener('leva:escape', handleEscape);
  }, []);

  const handleMouseEnter = (event) => {
    event.currentTarget.style.transform = 'translateY(-4px)';
    event.currentTarget.style.boxShadow = '0 8px 24px rgba(108,99,255,0.15)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 300);
  };

  const handleMouseLeave = (event) => {
    event.currentTarget.style.transform = 'translateY(0)';
    event.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div
      className="card"
      style={{
        width: '100%', minWidth: 0, padding: 22,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'visible',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ToolTooltip tool={tool} show={showTooltip} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span className={tagClass(tool.category)}>{tool.category}</span>
        <PricingBadge pricingType={tool.pricingType} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{tool.name}</h3>
        <span style={{ display: 'flex', flexShrink: 0 }}><AppIcon name={tool.iconKey} size={24} /></span>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
        {tool.desc}
      </p>
      <StarRating rating={tool.rating} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          disabled={isSaved}
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: 12,
            borderRadius: 10,
            border: isSaved ? '1px solid #CBD5E1' : 'none',
            background: isSaved ? '#E2E8F0' : 'var(--color-primary-light)',
            color: isSaved ? '#64748B' : 'var(--color-primary)',
            fontWeight: 600,
            cursor: isSaved ? 'not-allowed' : 'pointer',
          }}
        >
          {/* UI/UX Fix: Step 6 — Output device harus memberi respond jelas ke aksi user. Step 7 — Aksi destruktif (hapus) harus ada safeguard/konfirmasi. Survei: 52,5% user sulit temukan referensi. */}
          {isSaved ? 'Tersimpan ✓' : 'Simpan'}
        </button>
        <a
          href={`https://${tool.url}`} target="_blank" rel="noreferrer"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: 'none',
            padding: '8px', transition: 'background 0.2s',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Buka <AppIcon name="external-link" size={14} color="#fff" />
          </span>
        </a>
      </div>
    </div>
  );
}

// --- Small Tool Card (grid)
function SmallToolCard({ tool, onSave, isSaved }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef(null);
  const handleSave = () => {
    if (isSaved) return;
    onSave(tool);
  };

  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  useEffect(() => {
    const handleEscape = () => setShowTooltip(false);
    window.addEventListener('leva:escape', handleEscape);

    return () => window.removeEventListener('leva:escape', handleEscape);
  }, []);

  const handleMouseEnter = (event) => {
    event.currentTarget.style.transform = 'translateY(-2px)';
    event.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 300);
  };

  const handleMouseLeave = (event) => {
    event.currentTarget.style.transform = 'translateY(0)';
    event.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div
      className="card"
      style={{
        padding: 16, transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'visible',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ToolTooltip tool={tool} show={showTooltip} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className={tagClass(tool.category)}>{tool.category}</span>
        <PricingBadge pricingType={tool.pricingType} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex' }}><AppIcon name={tool.iconKey} size={20} /></span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{tool.name}</span>
        </div>
        <button
          disabled={isSaved}
          onClick={handleSave}
          title="Simpan ke Library"
          style={{
            background: isSaved ? '#E2E8F0' : 'var(--color-primary-light)',
            color: isSaved ? '#64748B' : 'var(--color-primary)',
            border: isSaved ? '1px solid #CBD5E1' : '1px solid #D7D2FF',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: isSaved ? 'not-allowed' : 'pointer',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {isSaved ? 'Tersimpan ✓' : 'Simpan'}
        </button>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {tool.desc}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{tool.url}</span>
        <StarRating rating={tool.rating} />
      </div>
    </div>
  );
}

// --- Main Dashboard View
export default function DashboardView() {
  const { user, saveToolToLibrary, setActiveView, savedTools } = useApp();
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [mounted, setMounted] = useState(false);
  const [showAllFeatured, setShowAllFeatured] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const firstName = user ? user.name.split(' ')[0] : 'Renisa';
  const jurusan   = user ? user.jurusan : 'Teknik Informatika';

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const greetIcon = hour < 11 ? 'lamp' : hour < 15 ? 'refresh' : hour < 18 ? 'calendar' : 'sparkles';

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const FILTERS = ['Semua', 'Research', 'Writing', 'Coding', 'Data', 'Academic', 'Productivity'];

  const featuredTools = mockTools;
  const visibleFeaturedTools = showAllFeatured ? featuredTools : featuredTools.slice(0, 6);
  const filteredTools = activeFilter === 'Semua'
    ? mockTools
    : mockTools.filter(t => t.category === activeFilter);
  const savedToolNames = new Set(savedTools.map((tool) => tool.name.toLowerCase()));

  const handleReplayTour = () => {
    window.dispatchEvent(new CustomEvent('leva:open-dashboard-tour'));
  };

  if (!mounted) return (
    <div className="main-content view-enter" style={{ padding: '32px 36px' }}>
      {[200, 300, 100].map((w, i) => (
        <div key={i} style={{ height: 20, width: w, background: 'var(--color-border)', borderRadius: 8, marginBottom: 10, animation: 'pulse 1.5s infinite' }} />
      ))}
      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 260, height: 200, background: 'var(--color-border)', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="main-content view-enter" style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>

      {/* -- Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            {greeting}, {firstName}! <AppIcon name={greetIcon} size={20} />
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Ini rekomendasi tools AI hari ini yang relevan untuk <strong>{jurusan}</strong> kamu.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{today}</p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, fontWeight: 600,
            background: 'var(--color-secondary-light)', color: 'var(--color-secondary)',
            padding: '3px 10px', borderRadius: 999,
          }}>
            <AppIcon name="refresh" size={12} /> Diperbarui otomatis setiap hari
          </span>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleReplayTour}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AppIcon name="sparkles" size={12} /> Lihat Tour Lagi
            </button>
          </div>
        </div>
      </div>

      {/* UI/UX Fix: Step 7 — Display as many choices as possible (grid vs scroll). Drop-down untuk sorting meminimalisir pencarian manual. Survei: 52,5% kesulitan temukan referensi tersimpan. */}
      {/* -- Featured Tools (responsive grid) */}
      <section data-tour="dashboard-featured-tools" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppIcon name="flame" size={18} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Tools Pilihan Hari Ini</h2>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
              - dipilihkan khusus untuk {jurusan}
            </span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleReplayTour}
            style={{ padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <AppIcon name="sparkles" size={12} /> Mulai Tutorial
          </button>
        </div>
        {visibleFeaturedTools.length > 0 ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {visibleFeaturedTools.map(tool => (
              <FeaturedToolCard
                key={tool.id}
                tool={tool}
                onSave={saveToolToLibrary}
                isSaved={savedToolNames.has(tool.name.toLowerCase())}
              />
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '26px 22px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Belum ada rekomendasi tools baru hari ini. Cek kembali besok!
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Sementara itu, jelajahi tools yang sudah kamu simpan di Library.
            </p>
            <button
              type="button"
              onClick={() => setActiveView('library')}
              style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Buka Library →
            </button>
          </div>
        )}
        {!showAllFeatured && featuredTools.length > 6 && visibleFeaturedTools.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              className="btn-ghost"
              onClick={() => setShowAllFeatured(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 14px' }}
            >
              Lihat Semua <AppIcon name="arrow-right" size={14} />
            </button>
          </div>
        )}
      </section>

      {/* -- Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: activeFilter === f ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeFilter === f ? '#fff' : 'var(--color-text-secondary)',
              boxShadow: activeFilter === f ? '0 2px 8px rgba(108,99,255,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* -- All Tools Grid */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <AppIcon name="news" size={18} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Semua Tools Hari Ini</h2>
          <span style={{
            fontSize: 12, fontWeight: 600, background: 'var(--color-primary-light)',
            color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 999,
          }}>
            {filteredTools.length} tools
          </span>
        </div>
        <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filteredTools.map(tool => (
            <SmallToolCard
              key={tool.id}
              tool={tool}
              onSave={saveToolToLibrary}
              isSaved={savedToolNames.has(tool.name.toLowerCase())}
            />
          ))}
        </div>
        {filteredTools.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'inline-flex' }}><AppIcon name="search" size={36} /></span>
            <p>Tidak ada tool untuk kategori ini.</p>
          </div>
        )}
      </section>

      {/* -- Productivity Tip Banner */}
      <div style={{
        background: 'var(--color-primary-light)',
        border: '1px solid rgba(108,99,255,0.2)',
        borderRadius: 16, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ display: 'flex', flexShrink: 0 }}><AppIcon name="lamp" size={28} /></span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Tips Produktivitas Hari Ini</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Coba ceritakan tugasmu ke Leva: <em>"Bantu aku buat literature review topik X untuk jurusan {jurusan}"</em> dan Leva akan otomatis memecahnya jadi langkah-langkah kecil plus merekomendasikan tools terbaik!
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setActiveView('chat')}
          style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '10px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          Coba Sekarang <AppIcon name="arrow-right" size={14} color="#fff" />
        </button>
      </div>
    </div>
  );
}
