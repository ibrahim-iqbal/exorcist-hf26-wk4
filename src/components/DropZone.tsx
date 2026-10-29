import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropZoneProps {
  onFileAccepted: (content: string) => void;
  disabled?: boolean;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export function DropZone({ onFileAccepted, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.name !== 'package.json') {
        setError('Only package.json files accepted');
        return;
      }
      if (file.size > 1_000_000) {
        setError('File too large (max 1MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          try {
            JSON.parse(text); // validate
            onFileAccepted(text);
          } catch {
            setError('Invalid JSON in package.json');
          }
        }
      };
      reader.onerror = () => setError('Failed to read file');
      reader.readAsText(file);
    },
    [onFileAccepted],
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled],
  );

  const onClickUpload = () => fileInputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={disabled ? undefined : onClickUpload}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${
            isDragging
              ? 'border-crimson bg-crimson/5 scale-[1.02]'
              : 'border-border-strong hover:border-crimson/40 hover:bg-surface-elevated/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-5 py-16 px-8">
          {/* Pentagram icon area */}
          <motion.div
            animate={isDragging ? { scale: 1.1, rotate: 15 } : { scale: 1, rotate: 0 }}
            transition={spring}
            className="w-20 h-20 rounded-full bg-surface-elevated border border-border-default flex items-center justify-center"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-colors duration-300 ${isDragging ? 'text-crimson' : 'text-text-secondary'}`}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </motion.div>

          <div className="text-center">
            <p className="font-heading text-xl text-text-primary tracking-wide">
              {isDragging ? 'Release the spirit...' : 'Drop your package.json'}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              or click to browse — we&apos;ll exorcise what lurks within
            </p>
          </div>

          {/* Demo button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                // Load demo package.json
                onFileAccepted(DEMO_PACKAGE_JSON);
              }
            }}
            className="
              mt-2 px-5 py-2 rounded-full text-sm font-medium
              bg-surface-elevated border border-border-strong
              text-text-secondary hover:text-crimson hover:border-crimson/40
              transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
              active:scale-95
            "
          >
            Try demo package.json
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 text-sm text-crimson text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Demo package.json with intentionally problematic deps for showcase */
const DEMO_PACKAGE_JSON = JSON.stringify(
  {
    name: 'haunted-project',
    version: '1.0.0',
    license: 'MIT',
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      lodash: '^4.17.21',
      underscore: '^1.13.6',
      moment: '^2.29.4',
      'date-fns': '^2.30.0',
      axios: '^1.6.0',
      'node-fetch': '^3.3.2',
      express: '^4.18.2',
      chalk: '^5.3.0',
      'left-pad': '^1.3.0',
      request: '^2.88.2',
    },
    devDependencies: {
      typescript: '^5.3.0',
      webpack: '^5.89.0',
      'ts-node': '^10.9.2',
    },
  },
  null,
  2,
);
