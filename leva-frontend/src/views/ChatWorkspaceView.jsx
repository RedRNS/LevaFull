import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockSubTasks, mockTools } from '../data/mockData';
import AppIcon from '../components/AppIcon';
import Modal from '../components/Modal';
import { playSoundEffect } from '../utils/sound';

// --- Tag color helper
const tagStyle = (cat) => {
  const map = {
    Research:     { bg: '#EDE9FE', color: '#7C3AED' },
    Writing:      { bg: '#FEF9C3', color: '#A16207' },
    Coding:       { bg: '#DBEAFE', color: '#1D4ED8' },
    Data:         { bg: '#DCFCE7', color: '#15803D' },
    Academic:     { bg: '#FFE4E6', color: '#BE123C' },
    Productivity: { bg: '#F0FDFA', color: '#0F766E' },
  };
  return map[cat] || { bg: '#F1F5F9', color: '#64748B' };
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_EXTENSIONS = ['pdf', 'txt'];
const QUICK_PROMPTS_BY_JURUSAN = {
  teknikInformatika: ['Bantu susun skripsi', 'Debug kode Python', 'Review jurnal IEEE', 'Belajar framework baru'],
  ilmuKomunikasi: ['Analisis konten media', 'Susun proposal riset', 'Review teori komunikasi', 'Buat kerangka esai'],
  default: ['Bantu susun skripsi', 'Cara belajar coding dari 0', 'Buat essay etika profesi', 'Analisis jurnal terkait'],
};

const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || '';

const validateAttachment = (file) => {
  if (!file) return 'Pilih file terlebih dahulu.';
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Ukuran file maksimal 10MB. File kamu ${fileSizeMb}MB. Coba kompres terlebih dahulu.`;
  }

  const extension = getFileExtension(file.name);
  if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(extension)) {
    return 'Format file belum didukung. Saat ini Leva menerima file PDF dan TXT.';
  }

  return '';
};

const getGeneratedTaskTitle = (text, jurusan, attachedFile) => {
  const raw = text.toLowerCase();

  if (attachedFile?.name) return `Memecah Tugas dari ${attachedFile.name}`;
  if (raw.includes('skripsi')) return `Menyusun Skripsi ${jurusan}`;
  if (raw.includes('essay')) return `Menulis Essay ${jurusan}`;
  if (raw.includes('koding') || raw.includes('coding')) return 'Belajar Koding dari Nol';
  if (raw.includes('resume')) return 'Membuat Resume Magang';

  return 'Menyelesaikan Tugas Akademik';
};

const getEstimatedProcessingMs = ({ text, attachedFile }) => {
  const baseMs = 12000;
  const textComplexityMs = Math.min(text.trim().length * 45, 15000);
  const attachmentMs = attachedFile ? 5000 : 0;
  return Math.min(baseMs + textComplexityMs + attachmentMs, 32000);
};

const getProcessingMessage = (elapsedSeconds) => {
  if (elapsedSeconds < 5) return 'Leva sedang membaca tugasmu...';
  if (elapsedSeconds < 15) return 'Memecah tugas menjadi langkah-langkah kecil...';
  if (elapsedSeconds < 30) return 'Mencari tools AI yang paling relevan...';
  return 'Hampir selesai, mohon tunggu sebentar...';
};

const RAG_ERROR_MESSAGE = 'Maaf, Leva belum bisa memproses tugasmu saat ini. Coba ulangi atau tulis ulang dengan deskripsi yang lebih spesifik.';

// --- Subtask Card
function SubTaskCard({ task, index, isExpanded, onToggle, onMarkDone, onSaveTool, isDoneJustNow }) {
  const tools = mockTools.filter(t => task.toolIds.includes(t.id));
  const ts = tagStyle(task.kategori);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const headerBgColor = isExpanded
    ? 'var(--color-primary-light)'
    : isHeaderHovered
      ? '#F1F5F9'
      : '#F8FAFC';

  return (
    <div className={`card ${isDoneJustNow ? 'subtask-card-highlight' : ''}`} style={{ marginBottom: 10, overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
      {/* Card Header */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        /* UI/UX Fix: Step 6 — Hotspot harus mudah dikenali (accordion). Step 7 — Aksi destruktif (reset) butuh safeguard. Statistik clickable meningkatkan keterhubungan antar layar. */
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', cursor: 'pointer',
          background: headerBgColor,
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Step number */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: task.status === 'done' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
            color: task.status === 'done' ? '#fff' : 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {task.status === 'done' ? <AppIcon name="check" size={14} color="#fff" /> : index + 1}
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
            {task.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {task.status === 'done'
            ? <span className={`badge-done ${isDoneJustNow ? 'badge-done-pop' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Done <AppIcon name="check" size={12} color="#fff" /></span>
            : (
              <span
                className="badge-next tooltip-host"
                data-tooltip="Lanjut ke subtask berikutnya"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Next Section <AppIcon name="arrow-right" size={12} />
              </span>
            )
          }
          <span style={{
            color: 'var(--color-text-secondary)', fontSize: 18, display: 'flex',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s',
          }}><AppIcon name="chevron-down" size={16} /></span>
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`subtask-content ${isExpanded ? 'open' : ''}`}>
        <div style={{ padding: '20px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 8, ...ts }}>
              {task.kategori}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '3px 10px', background: 'var(--color-bg)', borderRadius: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="clock" size={12} /> {task.estimasi}</span>
            </span>
          </div>

          {/* Description */}
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            {task.deskripsi}
          </p>

          {/* Action button */}
          {task.status !== 'done' ? (
            <button
              className="btn-primary"
              onClick={() => onMarkDone(task.id)}
              style={{ padding: '9px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <AppIcon name="check" size={14} color="#fff" /> Tandai Selesai
            </button>
          ) : (
            <button
              className="btn-ghost"
              onClick={() => onMarkDone(task.id)}
              style={{ padding: '9px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <AppIcon name="undo" size={14} /> Tandai Ulang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Right Panel: Tool Recommendations
function RightPanel({ task, isOpen, onSave, savedToolNames, onCopyTips, copiedTipsTaskId }) {
  const tools = task ? mockTools.filter(t => task.toolIds.includes(t.id)) : [];

  return (
    <div
      className={`right-panel ${isOpen ? 'open' : ''}`}
      style={{
        width: isOpen ? 280 : 0,
        minWidth: isOpen ? 280 : 0,
        height: '100%',
        background: 'var(--color-surface)',
        borderLeft: isOpen ? '1px solid var(--color-border)' : 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'sticky', top: 0,
        padding: isOpen ? '24px 16px' : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'width 0.3s ease, min-width 0.3s ease',
      }}
    >
      {!isOpen || !task ? null : (
        <>
          {/* Rekomendasi Tools */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em' }}>
              REKOMENDASI TOOLS AI
            </p>
            {tools.map(tool => {
              const isSaved = savedToolNames.has(tool.name.toLowerCase());

              return (
              <div
                key={tool.id}
                className="card"
                style={{ padding: '12px 14px', marginBottom: 10, border: '1px solid var(--color-border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex' }}><AppIcon name={tool.iconKey} size={18} /></span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{tool.name}</span>
                  </div>
                  <a
                    href={`https://${tool.url}`} target="_blank" rel="noreferrer"
                    aria-label={`Buka ${tool.name}`}
                    style={{ display: 'flex', color: 'var(--color-primary)', textDecoration: 'none' }}
                  ><AppIcon name="external-link" size={14} /></a>
                </div>
                <p style={{ margin: '6px 0 10px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {tool.desc.slice(0, 70)}...
                </p>
                <button
                  disabled={isSaved}
                  onClick={() => onSave(tool)}
                  style={{
                    width: '100%',
                    padding: '7px',
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 10,
                    border: isSaved ? '1px solid #86EFAC' : 'none',
                    background: isSaved ? '#DCFCE7' : 'var(--color-primary-light)',
                    color: isSaved ? '#15803D' : 'var(--color-primary)',
                    fontWeight: 600,
                    cursor: isSaved ? 'not-allowed' : 'pointer',
                  }}
                >
                  <AppIcon name={isSaved ? 'check' : 'book'} size={12} /> {isSaved ? '✓ Tersimpan' : 'Simpan ke Library'}
                </button>
              </div>
              );
            })}
          </div>

          {/* Tips Penggunaan */}
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 12, padding: '14px 14px', marginBottom: 16,
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#92400E' }}>
              CARA MENGGUNAKAN TOOL INI
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
              {task.tips}
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: 12, padding: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => onCopyTips(task)}
            >
              <AppIcon name="copy" size={12} /> {copiedTipsTaskId === task.id ? '✓ Tersalin!' : 'Salin Prompt Tips'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Main Chat Workspace View
export default function ChatWorkspaceView() {
  const {
    user,
    activeTask,
    setActiveTask,
    setActiveView,
    setChatHasDraft,
    saveToolToLibrary,
    savedTools,
    showToast,
    soundEnabled,
  } = useApp();
  const firstName = user ? user.name.split(' ')[0] : 'Renisa';
  const jurusan   = user ? user.jurusan : 'Teknik Informatika';

  const [inputVal, setInputVal]         = useState('');
  const [taskTitle, setTaskTitle]       = useState('');
  const [subTasks, setSubTasks]         = useState([]);
  const [expandedId, setExpandedId]     = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [followUpVal, setFollowUpVal]   = useState('');
  const [followUpReply, setFollowUpReply] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileError, setFileError]       = useState('');
  const [ragError, setRagError]         = useState('');
  const [lastSubmission, setLastSubmission] = useState(null);
  const [loadingElapsedSeconds, setLoadingElapsedSeconds] = useState(0);
  const [estimatedProcessingSeconds, setEstimatedProcessingSeconds] = useState(15);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [copiedTipsTaskId, setCopiedTipsTaskId] = useState(null);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [showCompletionConfetti, setShowCompletionConfetti] = useState(false);
  const [justCompletedTaskIds, setJustCompletedTaskIds] = useState([]);
  const [showLeaveDraftModal, setShowLeaveDraftModal] = useState(false);
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const copyResetTimerRef = useRef(null);
  const followUpTextareaRef = useRef(null);
  const completionPrimaryActionRef = useRef(null);
  const hasUnsentDraftRef = useRef(false);
  const hasPushedBackGuardRef = useRef(false);
  const allowExternalLeaveRef = useRef(false);
  const completionAnimationTimersRef = useRef([]);
  const hasCelebratedAllDoneRef = useRef(false);

  const completionConfettiPieces = useMemo(
    () => Array.from({ length: 28 }, (_, index) => {
      const colors = ['#6C63FF', '#10B981', '#F59E0B', '#14B8A6', '#EC4899', '#3B82F6'];
      return {
        id: `completion-confetti-${index}`,
        left: `${(index * 9) % 100}%`,
        delay: `${(index % 8) * 0.07}s`,
        duration: `${1.1 + (index % 6) * 0.16}s`,
        color: colors[index % colors.length],
      };
    }),
    []
  );

  const resetWorkspace = () => {
    setTaskTitle('');
    setSubTasks([]);
    setExpandedId(null);
    setIsLoading(false);
    setInputVal('');
    setFollowUpVal('');
    setFollowUpReply('');
    setAttachedFile(null);
    setFileError('');
    setRagError('');
    setLastSubmission(null);
    setLoadingElapsedSeconds(0);
    setEstimatedProcessingSeconds(15);
    setShowLeaveDraftModal(false);
    setPendingLeaveTarget(null);
    setIsDraggingFile(false);
    setCopiedTipsTaskId(null);
    setShowCompletionOverlay(false);
    setShowCompletionConfetti(false);
    setJustCompletedTaskIds([]);
    completionAnimationTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    completionAnimationTimersRef.current = [];
    hasCelebratedAllDoneRef.current = false;
  };

  // Load from history task if set
  useEffect(() => {
    if (activeTask) {
      setTaskTitle('Menyusun Skripsi ' + jurusan);
      setSubTasks(mockSubTasks.map(t => ({ ...t })));
      setExpandedId(1);
    } else {
      resetWorkspace();
    }
  }, [activeTask]);

  useEffect(() => {
    const handleNewChat = () => resetWorkspace();

    window.addEventListener('leva:new-chat', handleNewChat);
    return () => window.removeEventListener('leva:new-chat', handleNewChat);
  }, []);

  useEffect(() => () => {
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    completionAnimationTimersRef.current.forEach((timerId) => clearTimeout(timerId));
  }, []);

  const hasUnsentDraft = inputVal.trim().length > 0;

  useEffect(() => {
    hasUnsentDraftRef.current = hasUnsentDraft;
    setChatHasDraft(hasUnsentDraft);
  }, [hasUnsentDraft, setChatHasDraft]);

  useEffect(() => () => {
    setChatHasDraft(false);
  }, [setChatHasDraft]);

  useEffect(() => {
    if (!hasUnsentDraft || hasPushedBackGuardRef.current) return;

    window.history.pushState({ levaChatDraftGuard: true }, '', window.location.href);
    hasPushedBackGuardRef.current = true;
  }, [hasUnsentDraft]);

  useEffect(() => {
    if (hasUnsentDraft) return;
    hasPushedBackGuardRef.current = false;
  }, [hasUnsentDraft]);

  useEffect(() => {
    const handleBackNavigation = () => {
      if (!hasUnsentDraftRef.current || allowExternalLeaveRef.current) return;

      window.history.pushState({ levaChatDraftGuard: true }, '', window.location.href);
      setPendingLeaveTarget('__history_back__');
      setShowLeaveDraftModal(true);
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, []);

  useEffect(() => {
    if (!hasUnsentDraft) return;

    const handleBeforeUnload = (event) => {
      if (allowExternalLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsentDraft]);

  useEffect(() => {
    const handleConfirmLeaveChat = (event) => {
      const nextView = event.detail?.nextView;
      if (!hasUnsentDraftRef.current || !nextView) return;

      setPendingLeaveTarget(nextView);
      setShowLeaveDraftModal(true);
    };

    window.addEventListener('leva:confirm-leave-chat', handleConfirmLeaveChat);
    return () => window.removeEventListener('leva:confirm-leave-chat', handleConfirmLeaveChat);
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setLoadingElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  const applyAttachment = (file) => {
    /* UI/UX Fix: Step 6 — Menambah alternatif input device (file upload + drag-drop) untuk mengurangi beban kognitif memecah tugas. Survei: 76,3% user habiskan >15 menit sebelum mulai kerja. */
    const validationError = validateAttachment(file);

    if (validationError) {
      setAttachedFile(null);
      setFileError(validationError);
      return;
    }

    setAttachedFile(file);
    setFileError('');
    setRagError('');
  };

  const removeAttachment = () => {
    /* UI/UX Fix: Step 7 — Kontrol screen-based berupa chip removable membantu pengguna mengecek dan mengoreksi file sebelum mengirim. */
    setAttachedFile(null);
    setFileError('');
  };

  const runMockRag = (submissionPayload) => {
    const text = submissionPayload.text.trim();
    const estimatedMs = getEstimatedProcessingMs(submissionPayload);
    const loweredText = text.toLowerCase();

    const ragPromise = new Promise((resolve, reject) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        reject(new Error('offline'));
        return;
      }

      if (loweredText.includes('server error') || loweredText.includes('server gagal')) {
        setTimeout(() => reject(new Error('server-error')), 1200);
        return;
      }

      setTimeout(() => {
        resolve({
          title: getGeneratedTaskTitle(text, jurusan, submissionPayload.attachedFile),
          subTasks: mockSubTasks.map((task) => ({ ...task })),
        });
      }, estimatedMs);
    });

    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('timeout')), 45000);
    });

    return Promise.race([ragPromise, timeoutPromise]).finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });
  };

  const submitTaskToRag = async (submissionPayload) => {
    const trimmedText = submissionPayload.text.trim();
    if (!trimmedText || isLoading) return;

    const estimatedMs = getEstimatedProcessingMs(submissionPayload);

    setIsLoading(true);
    setRagError('');
    setLoadingElapsedSeconds(0);
    setEstimatedProcessingSeconds(Math.max(15, Math.round(estimatedMs / 1000)));
    setTaskTitle('');
    setSubTasks([]);
    setExpandedId(null);

    try {
      const ragResult = await runMockRag(submissionPayload);
      setTaskTitle(ragResult.title);
      setSubTasks(ragResult.subTasks);
      setExpandedId(1);
      setInputVal('');
      setAttachedFile(null);
      setFileError('');
      setRagError('');
    } catch {
      setRagError(RAG_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickAttachment = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const handleAttachmentInput = (event) => {
    const file = event.target.files?.[0];
    if (file) applyAttachment(file);
    event.target.value = '';
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFile(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const file = event.dataTransfer.files?.[0];
    if (file) applyAttachment(file);
  };

  const handleSubmit = () => {
    if (isLoading) return;
    if (!inputVal.trim()) return;
    if (fileError) return;

    const submissionPayload = {
      text: inputVal,
      attachedFile,
    };

    setLastSubmission(submissionPayload);
    submitTaskToRag(submissionPayload);
  };

  const handleRetryLastSubmission = () => {
    if (!lastSubmission || isLoading) return;
    submitTaskToRag(lastSubmission);
  };

  const handleStayInChat = () => {
    setShowLeaveDraftModal(false);
    setPendingLeaveTarget(null);
  };

  const handleLeaveFromChat = () => {
    const target = pendingLeaveTarget;

    setShowLeaveDraftModal(false);
    setPendingLeaveTarget(null);

    if (!target) return;

    if (target === '__history_back__') {
      allowExternalLeaveRef.current = true;
      setInputVal('');
      setAttachedFile(null);
      setFileError('');
      setRagError('');

      setTimeout(() => {
        window.history.back();
      }, 0);

      return;
    }

    setActiveView(target, { force: true });
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const toggleDone = (id) => {
    let isMarkingDone = false;

    setSubTasks(prev =>
      prev.map((taskItem) => {
        if (taskItem.id !== id) return taskItem;

        const nextStatus = taskItem.status === 'done' ? 'next' : 'done';
        if (taskItem.status !== 'done' && nextStatus === 'done') isMarkingDone = true;

        return { ...taskItem, status: nextStatus };
      })
    );

    /* UI/UX Fix: Step 6 — Output device speaker (sound feedback) untuk positive reinforcement. Micro-animations memberikan reward psikologis, mendukung habit loop. 47,5% user bekerja larut malam — dopamine hit kecil membantu. */
    if (isMarkingDone && soundEnabled) {
      playSoundEffect('chime');
    }

    if (isMarkingDone) {
      setJustCompletedTaskIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

      const timerId = setTimeout(() => {
        setJustCompletedTaskIds((prev) => prev.filter((taskId) => taskId !== id));
      }, 520);
      completionAnimationTimersRef.current.push(timerId);
    }
  };

  const handleFollowUp = () => {
    if (!followUpVal.trim()) return;
    setFollowUpReply('');
    setTimeout(() => {
      setFollowUpReply(
        `Untuk subtask "${subTasks.find(t => t.id === expandedId)?.title ?? 'ini'}", aku sarankan mulai dengan Perplexity AI - masukkan kata kunci jurusan kamu dan minta ia menganalisis tren topik 2024-2025. Ini jauh lebih efisien dibandingkan browsing manual di Google Scholar.`
      );
      setFollowUpVal('');
    }, 1200);
  };

  const autoResizeFollowUpTextarea = (textareaEl) => {
    if (!textareaEl) return;
    textareaEl.style.height = '44px';
    const nextHeight = Math.min(textareaEl.scrollHeight, 150);
    textareaEl.style.height = `${nextHeight}px`;
    textareaEl.style.overflowY = textareaEl.scrollHeight > 150 ? 'auto' : 'hidden';
  };

  useEffect(() => {
    autoResizeFollowUpTextarea(followUpTextareaRef.current);
  }, [followUpVal]);

  const expandedTask  = subTasks.find(t => t.id === expandedId) ?? null;
  const hasResults    = subTasks.length > 0;
  const canSendMessage = inputVal.trim().length > 0;
  const processingMessage = getProcessingMessage(loadingElapsedSeconds);
  const rightPanelOpen = !!expandedTask;
  const savedToolNames = new Set(savedTools.map((tool) => tool.name.toLowerCase()));

  const handleCopyTips = async (task) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API tidak tersedia');
      }

      await navigator.clipboard.writeText(task.tips);
      setCopiedTipsTaskId(task.id);
      showToast('Tersalin! Prompt tips berhasil disalin ke clipboard.', 'success');

      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = setTimeout(() => setCopiedTipsTaskId(null), 2000);
    } catch {
      showToast('Gagal menyalin prompt tips.', 'error');
    }
  };

  const completedCount = subTasks.filter(t => t.status === 'done').length;
  const progressPct    = subTasks.length ? Math.round((completedCount / subTasks.length) * 100) : 0;
  const allTasksDone = subTasks.length > 0 && completedCount === subTasks.length;
  const quickPromptChips = useMemo(() => {
    const normalizedJurusan = jurusan.trim().toLowerCase();

    /* UI/UX Fix: Step 6 — Keyboard shortcuts minimalisir pergerakan tangan (47,5% user larut malam). Step 7 — Disabled state = "work the way it looks". Quick prompts kontekstual mengurangi 35,6% keluhan AI terlalu generik. */
    if (normalizedJurusan.includes('teknik informatika')) return QUICK_PROMPTS_BY_JURUSAN.teknikInformatika;
    if (normalizedJurusan.includes('ilmu komunikasi')) return QUICK_PROMPTS_BY_JURUSAN.ilmuKomunikasi;

    return QUICK_PROMPTS_BY_JURUSAN.default;
  }, [jurusan]);

  useEffect(() => {
    if (!allTasksDone) {
      hasCelebratedAllDoneRef.current = false;
      setShowCompletionOverlay(false);
      setShowCompletionConfetti(false);
      return;
    }

    if (hasCelebratedAllDoneRef.current) return;
    hasCelebratedAllDoneRef.current = true;

    if (soundEnabled) playSoundEffect('celebration');
    setShowCompletionOverlay(true);
    setShowCompletionConfetti(true);

    const confettiTimer = setTimeout(() => setShowCompletionConfetti(false), 3000);

    return () => {
      clearTimeout(confettiTimer);
    };
  }, [allTasksDone, soundEnabled]);

  useEffect(() => {
    if (!showCompletionOverlay) return;

    completionPrimaryActionRef.current?.focus();
  }, [showCompletionOverlay]);

  const handleViewSummary = () => {
    setShowCompletionOverlay(false);
  };

  const handleStartNewTask = () => {
    window.dispatchEvent(new CustomEvent('leva:new-chat'));
    setActiveTask(null);
    setShowCompletionOverlay(false);
  };

  return (
    <div className="view-enter main-content" style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* -- CENTER PANEL */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: hasResults ? '28px 32px' : '0', display: 'flex', flexDirection: 'column' }}>

          {/* -- EMPTY STATE */}
          {!hasResults && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', minHeight: 'calc(100vh - 100px)',
            }}>
              <div style={{ display: 'flex', marginBottom: 16 }}><AppIcon name="sparkles" size={40} /></div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>
                Hei, {firstName}! Ceritakan tugasmu hari ini.
              </h2>
              <p style={{ margin: '0 0 32px', fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 440, lineHeight: 1.65 }}>
                Leva akan memecahnya jadi langkah-langkah kecil dan merekomendasikan tools AI terbaik untukmu.
              </p>

              {/* Main Input */}
              <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
                {/* UI/UX Fix: Step 6 — Filter file picker disiapkan untuk skenario dokumen tugas kampus yang paling umum dipakai user. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleAttachmentInput}
                  style={{ display: 'none' }}
                />

                {attachedFile && (
                  <div
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      marginBottom: 10, background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)', borderRadius: 999, padding: '7px 12px',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <AppIcon name="paperclip" size={12} />
                    <span>{attachedFile.name}</span>
                    <button
                      onClick={removeAttachment}
                      aria-label="Hapus file"
                      style={{
                        border: 'none', background: 'transparent', color: 'var(--color-primary)',
                        cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                      }}
                    >
                      <AppIcon name="x" size={13} />
                    </button>
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={inputVal}
                  disabled={isLoading}
                  onChange={e => {
                    setInputVal(e.target.value);
                    if (ragError) setRagError('');
                  }}
                  onKeyDown={e => {
                    /* UI/UX Fix: Step 7 — Menyediakan kontrol keyboard (Enter/Ctrl+Enter) untuk efisiensi pada user laptop/desktop. */
                    const shouldSend = e.key === 'Enter' && (e.ctrlKey || !e.shiftKey);
                    if (shouldSend && !isLoading) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Contoh: aku mau bikin skripsi, atau bantu aku buat essay etika profesi..."
                  rows={3}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    width: '100%', padding: '16px 56px 40px 50px',
                    border: '2px solid var(--color-border)',
                    borderRadius: 16, fontSize: 14, resize: 'none',
                    outline: 'none', color: 'var(--color-text-primary)',
                    lineHeight: 1.6, boxSizing: 'border-box',
                    transition: 'border 0.2s',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                    background: isLoading ? '#F8FAFC' : '#fff',
                    cursor: isLoading ? 'not-allowed' : 'text',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--color-border)'}
                />

                <button
                  onClick={handlePickAttachment}
                  disabled={isLoading}
                  aria-label="Unggah file"
                  className="tooltip-host"
                  data-tooltip="Lampirkan file PDF silabus atau dokumen tugasmu"
                  style={{
                    position: 'absolute', left: 12, bottom: 12,
                    background: 'transparent',
                    border: 'none', borderRadius: 10, padding: 6,
                    cursor: isLoading ? 'default' : 'pointer',
                    color: 'var(--color-primary)', fontSize: 16,
                    display: 'flex', opacity: isLoading ? 0.45 : 1,
                  }}
                >
                  <AppIcon name="paperclip" size={16} />
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !canSendMessage || !!fileError}
                  aria-label="Kirim pesan"
                  style={{
                    position: 'absolute', right: 12, bottom: 12,
                    background: canSendMessage ? 'var(--color-primary)' : 'var(--color-border)',
                    border: 'none', borderRadius: 10, padding: '8px 12px',
                    cursor: (isLoading || !canSendMessage || !!fileError) ? 'default' : 'pointer',
                    color: '#fff', fontSize: 16, transition: 'background 0.2s', display: 'flex', opacity: (isLoading || !canSendMessage || !!fileError) ? 0.55 : 1,
                  }}
                >
                  {isLoading
                    ? <AppIcon name="loader" size={16} color="#fff" className="send-spinner" />
                    : <AppIcon name="send" size={16} color="#fff" />}
                </button>

                {isDraggingFile && !isLoading && (
                  <div
                    className="file-drop-overlay"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    Lepaskan file di sini
                  </div>
                )}
              </div>

              {fileError && (
                <p style={{ marginTop: 10, fontSize: 12, color: '#DC2626', width: '100%', maxWidth: 560 }}>
                  {fileError}
                </p>
              )}

              {isLoading && (
                <div style={{ marginTop: 10, width: '100%', maxWidth: 560, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ display: 'inline-flex', marginTop: 2 }}>
                      <AppIcon name="loader" size={16} className="send-spinner" />
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {processingMessage}
                        <span className="processing-indicator" style={{ marginLeft: 3 }}>
                          <span className="processing-dot">.</span>
                          <span className="processing-dot">.</span>
                          <span className="processing-dot">.</span>
                        </span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        (estimasi ~{estimatedProcessingSeconds} detik)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ragError && !isLoading && (
                <div style={{ marginTop: 10, width: '100%', maxWidth: 560, background: '#FDF2F8', border: '1px solid #FCA5A5', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#B91C1C', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ display: 'inline-flex', marginTop: 1 }}><AppIcon name="warning" size={13} color="#DC2626" /></span>
                    <span>{ragError}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryLastSubmission}
                    disabled={!lastSubmission || isLoading}
                    style={{ marginTop: 10, border: '1px solid #FCA5A5', background: '#fff', color: '#B91C1C', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '6px 10px', cursor: !lastSubmission || isLoading ? 'not-allowed' : 'pointer', opacity: !lastSubmission || isLoading ? 0.6 : 1 }}
                  >
                    🔄 Coba Lagi
                  </button>
                </div>
              )}

              {!isLoading && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>Tekan Enter atau Ctrl+Enter untuk kirim</p>}

              {/* Quick suggestions */}
              <p style={{ margin: '20px 0 8px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Atau coba salah satu contoh ini:
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {quickPromptChips.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      if (isLoading) return;
                      setInputVal(s);
                      inputRef.current?.focus();
                    }}
                    style={{
                      padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      cursor: 'pointer', color: 'var(--color-text-secondary)',
                      transition: 'all 0.2s',
                      opacity: isLoading ? 0.55 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- RESULTS */}
          {hasResults && !isLoading && (
            <>
              {/* Task Title Card */}
              <div style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #8B5CF6 100%)',
                borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 12, opacity: 0.75, fontWeight: 600, letterSpacing: '0.06em' }}>TASK AKTIF</p>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{taskTitle}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, opacity: 0.75 }}>{completedCount}/{subTasks.length} selesai</p>
                  <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3 }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: '#fff', borderRadius: 3, transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              </div>

              {/* Subtask List */}
              {subTasks.map((task, i) => (
                <SubTaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  isExpanded={expandedId === task.id}
                  onToggle={() => toggleExpand(task.id)}
                  onMarkDone={toggleDone}
                  onSaveTool={saveToolToLibrary}
                  isDoneJustNow={justCompletedTaskIds.includes(task.id)}
                />
              ))}

              {completedCount === subTasks.length && subTasks.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-secondary), #059669)',
                  borderRadius: 16, padding: '24px', textAlign: 'center', marginTop: 16, color: '#fff',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><AppIcon name="check" size={40} color="#fff" /></div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Semua task selesai!</h3>
                  <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                    Kerja bagus, {firstName}! Kamu berhasil menyelesaikan semua langkah untuk "{taskTitle}".
                  </p>
                </div>
              )}

              {/* Follow-up Input */}
              <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                {followUpReply && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}><AppIcon name="sparkles" size={12} color="#fff" /></div>
                    <div style={{ background: 'var(--color-primary-light)', borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-primary)', flex: 1 }}>
                      {followUpReply}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    ref={followUpTextareaRef}
                    value={followUpVal}
                    onChange={e => setFollowUpVal(e.target.value)}
                    onInput={e => autoResizeFollowUpTextarea(e.currentTarget)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFollowUp();
                      }
                    }}
                    placeholder="Tanya lebih lanjut tentang task ini..."
                    rows={1}
                    style={{
                      flex: 1, padding: '10px 14px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10, fontSize: 13, outline: 'none',
                      minHeight: 44,
                      maxHeight: 150,
                      resize: 'none',
                      lineHeight: 1.55,
                      overflowY: 'hidden',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--color-border)'}
                  />
                  <button className="btn-primary tooltip-host" data-tooltip="Kirim (Enter)" onClick={handleFollowUp} style={{ padding: '10px 18px', fontSize: 13 }}>
                    Kirim
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- RIGHT PANEL */}
      <RightPanel
        task={expandedTask}
        isOpen={rightPanelOpen}
        onSave={saveToolToLibrary}
        savedToolNames={savedToolNames}
        onCopyTips={handleCopyTips}
        copiedTipsTaskId={copiedTipsTaskId}
      />

      {showCompletionOverlay && (
        <div className="completion-overlay">
          {showCompletionConfetti && (
            <div className="completion-confetti-layer" aria-hidden="true">
              {completionConfettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="completion-confetti-piece"
                  style={{
                    left: piece.left,
                    background: piece.color,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                  }}
                />
              ))}
            </div>
          )}

          <div className="completion-card" role="dialog" aria-modal="true" aria-label="Semua subtask selesai" onClick={(event) => event.stopPropagation()}>
            <div className="completion-icon-wrap">
              <AppIcon name="check" size={44} color="#fff" />
            </div>
            <h3 className="completion-title">🎉 Selamat! Semua subtask selesai!</h3>
            <p className="completion-subtitle">Kerja bagus, {firstName}! Kamu telah menyelesaikan {taskTitle}.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button ref={completionPrimaryActionRef} className="btn-primary" onClick={handleViewSummary} style={{ flex: 1 }}>
                Lihat Ringkasan
              </button>
              <button className="btn-ghost" onClick={handleStartNewTask} style={{ flex: 1 }}>
                Mulai Task Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveDraftModal && (
        <Modal title="Teks Belum Terkirim" onClose={handleStayInChat}>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Kamu memiliki teks yang belum dikirim. Yakin ingin meninggalkan halaman?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleStayInChat}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: 10,
                background: '#6C5CE7',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              Tetap di Sini
            </button>
            <button
              type="button"
              onClick={handleLeaveFromChat}
              style={{
                flex: 1,
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                background: '#fff',
                color: 'var(--color-text-secondary)',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              Tinggalkan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
