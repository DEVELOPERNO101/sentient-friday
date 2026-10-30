export type SupportedPlatform = 'windows' | 'macos' | 'linux' | 'unknown';
export type ModelProvider = 'ollama' | 'llama-cpp' | 'lm-studio' | 'openai' | 'anthropic' | 'openrouter';

export type RuntimeConfig = {
  platform: SupportedPlatform;
  userHome: string;
  knowledgeBaseDirectory: string;
  sidecarDirectory: string;
  localModelDirectory: string;
};

export type RuntimeSettings = {
  onboardingComplete: boolean;
  knowledgeBaseDirectory: string;
  mainModelProvider: ModelProvider;
  doubleTapModelProvider: ModelProvider;
  sidecarEnabled: boolean;
};

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  onboardingComplete: false,
  knowledgeBaseDirectory: resolveKnowledgeBasePath(),
  mainModelProvider: 'ollama',
  doubleTapModelProvider: 'openai',
  sidecarEnabled: true
};

function toSafePath(value: string): string {
  return value.replace(/[\\/]+$/, '');
}

export function detectPlatform(): SupportedPlatform {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';

  return 'unknown';
}

export function getUserHomeDirectory(): string {
  const platform = detectPlatform();
  const runtimeProcess = (globalThis as { process?: { env?: Record<string, string> } }).process;

  if (runtimeProcess?.env) {
    const home = platform === 'windows' ? runtimeProcess.env.USERPROFILE : runtimeProcess.env.HOME;
    if (home && home.trim()) return toSafePath(home);
  }

  if (platform === 'windows') return 'C:\\Users\\Default';
  if (platform === 'macos') return '/Users/default';
  return '/home/default';
}

export function joinRuntimePath(...segments: string[]): string {
  const values = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^\\+|\\+$/g, '').replace(/^\/+|\/+$/g, ''));

  if (values.length === 0) return '';

  const [first, ...rest] = values;

  return [first, ...rest].join(detectPlatform() === 'windows' ? '\\' : '/');
}

export function resolveKnowledgeBasePath(): string {
  const platform = detectPlatform();
  const home = getUserHomeDirectory();
  const baseName = 'Sentient OS - Knowledge Base';

  if (platform === 'windows') {
    return `${toSafePath(home)}\\${baseName}`;
  }

  return `${toSafePath(home)}/${baseName}`;
}

export function getRuntimeConfig(): RuntimeConfig {
  const platform = detectPlatform();
  const userHome = getUserHomeDirectory();
  const knowledgeBaseDirectory = resolveKnowledgeBasePath();

  return {
    platform,
    userHome,
    knowledgeBaseDirectory,
    sidecarDirectory: joinRuntimePath(knowledgeBaseDirectory, 'sidecar'),
    localModelDirectory: joinRuntimePath(knowledgeBaseDirectory, 'models')
  };
}

export function buildVaultFilePath(notePath: string): string {
  const normalized = notePath.replace(/^[/\\]+/, '').replace(/^[.]/, '');
  return joinRuntimePath(resolveKnowledgeBasePath(), normalized);
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function getRuntimeSettings(): RuntimeSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_RUNTIME_SETTINGS };
  }

  const saved = window.localStorage.getItem('sentient-runtime-settings');
  if (!saved) {
    return { ...DEFAULT_RUNTIME_SETTINGS };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<RuntimeSettings>;
    return {
      ...DEFAULT_RUNTIME_SETTINGS,
      ...parsed,
      knowledgeBaseDirectory: parsed.knowledgeBaseDirectory || resolveKnowledgeBasePath()
    };
  } catch {
    return { ...DEFAULT_RUNTIME_SETTINGS };
  }
}

export function saveRuntimeSettings(settings: RuntimeSettings): RuntimeSettings {
  const next = {
    ...DEFAULT_RUNTIME_SETTINGS,
    ...settings,
    knowledgeBaseDirectory: settings.knowledgeBaseDirectory || resolveKnowledgeBasePath()
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('sentient-runtime-settings', JSON.stringify(next));
  }

  return next;
}
